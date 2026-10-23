"""Headless-Chrome housekeeping for the Inside Desk build.

Every Chrome the build starts (chrome_shot in build.py, the ePaper renders via node + epaper/cdp.mjs) keeps its
profile and temp files inside ONE per-run directory, $INSIDEDESK_RUN_TMP (also exported as TMPDIR), and is
started in its own process group. `run_dir()` creates that directory and, on exit (normal end, error, Ctrl-C,
SIGTERM/SIGHUP), kills every process still carrying the run's marker and removes the directory.
"""
import contextlib, os, shutil, signal, subprocess, tempfile, time

MARK = "INSIDEDESK_RUN_TMP"
PREFIX = "insidedesk-build-"


def _alive(pid):
    try: os.kill(pid, 0); return True
    except ProcessLookupError: return False
    except PermissionError: return True


def _marked(tmp):
    """PIDs (other than us) whose environment carries this run's marker: Chrome, its zygote/renderers, node."""
    me, needle, out = os.getpid(), f"{MARK}={tmp}".encode(), []
    for p in os.listdir("/proc"):
        if not p.isdigit() or int(p) == me: continue
        try:
            with open(f"/proc/{p}/environ", "rb") as f:
                if needle in f.read().split(b"\0"): out.append(int(p))
        except OSError: pass
    return out


def sweep(tmp):
    """SIGTERM, then SIGKILL, every process left over from this run."""
    pids = _marked(tmp)
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for pid in pids:
            with contextlib.suppress(OSError): os.kill(pid, sig)
        for _ in range(20):
            pids = [p for p in pids if _alive(p) and not _zombie(p)]
            if not pids: return
            time.sleep(0.1)


def _zombie(pid):
    try:
        with open(f"/proc/{pid}/stat") as f: return f.read().rsplit(")", 1)[1].split()[0] == "Z"
    except OSError: return False


def _stale(base):
    """Remove run dirs of earlier builds that died without cleaning up (owner PID gone). Only our own prefix."""
    for d in os.listdir(base):
        if not d.startswith(PREFIX): continue
        try: pid = int(d[len(PREFIX):].split("-")[0])
        except ValueError: continue
        if pid != os.getpid() and not _alive(pid):
            shutil.rmtree(os.path.join(base, d), ignore_errors=True)


def _raise_exit(signum, frame):
    raise SystemExit(128 + signum)


@contextlib.contextmanager
def run_dir():
    base = tempfile.gettempdir()
    with contextlib.suppress(OSError): _stale(base)
    tmp = tempfile.mkdtemp(prefix=f"{PREFIX}{os.getpid()}-", dir=base)
    saved_env = {k: os.environ.get(k) for k in (MARK, "TMPDIR")}
    saved_sig = {s: signal.getsignal(s) for s in (signal.SIGTERM, signal.SIGHUP)}
    os.environ[MARK] = tmp; os.environ["TMPDIR"] = tmp; tempfile.tempdir = None  # tempfile re-reads TMPDIR
    for s in saved_sig: signal.signal(s, _raise_exit)
    try:
        yield tmp
    finally:
        for s, h in saved_sig.items(): signal.signal(s, h)
        try: sweep(tmp)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
            for k, v in saved_env.items():
                if v is None: os.environ.pop(k, None)
                else: os.environ[k] = v
            tempfile.tempdir = None


def run(cmd, timeout, capture=False):
    """subprocess.run in a fresh process group; afterwards (also on timeout/error) the group and any Chrome left
    over from this run are killed."""
    p = subprocess.Popen(cmd, start_new_session=True, **({"stdout": subprocess.PIPE, "stderr": subprocess.PIPE, "text": True} if capture else {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}))
    try:
        out, err = p.communicate(timeout=timeout)
        return subprocess.CompletedProcess(cmd, p.returncode, out, err)
    except subprocess.TimeoutExpired:
        raise
    finally:
        with contextlib.suppress(OSError): os.killpg(p.pid, signal.SIGKILL)
        if p.poll() is None:
            with contextlib.suppress(Exception): p.kill(); p.wait(5)
        if os.environ.get(MARK): sweep(os.environ[MARK])
