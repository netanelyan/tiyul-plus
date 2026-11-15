/**
 * `npm run deploy` - puts the committed HEAD live on the VPS.
 *
 * This replaces Vercel's deploy-on-push: **pushing to GitHub no longer changes
 * what is live, this does.** The build runs on the server (deploy/release.sh),
 * so the native modules - sharp, lightningcss, the Tailwind oxide binary - are
 * the Linux ones and nothing built on Windows ever reaches production.
 *
 *   npm run deploy                   build HEAD on the VPS, smoke-test it, go live
 *   npm run deploy -- rollback       put the previous release back (seconds, no build)
 *   npm run deploy -- rollback <id>  a specific release (ids: npm run deploy -- status)
 *   npm run deploy -- status         what is live, and is it healthy
 *   npm run deploy -- logs           follow the app's log
 *
 * The host is the `tiyul-vps` entry in ~/.ssh/config (override: DEPLOY_HOST).
 *
 * Written in Node rather than bash because on Windows `bash` on the PATH is the
 * WSL launcher, which has neither this repo's git state nor the ssh config.
 */
import { spawn, spawnSync } from 'node:child_process';

const HOST = process.env.DEPLOY_HOST || 'tiyul-vps';
const APP = '/opt/tiyulplus-web';
const [cmd = 'release', arg = ''] = process.argv.slice(2);

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout.trim();

function ssh(remote, { tty = false, stdin = 'inherit' } = {}) {
  return spawn('ssh', [...(tty ? ['-t'] : []), HOST, remote], {
    stdio: [stdin, 'inherit', 'inherit'],
  });
}

function exitWith(child) {
  child.on('exit', (code) => process.exit(code ?? 1));
}

if (cmd === 'rollback') {
  if (arg && !/^[\w.-]+$/.test(arg)) throw new Error(`not a release id: ${arg}`);
  exitWith(ssh(`bash ${APP}/current/deploy/rollback.sh ${arg}`));
} else if (cmd === 'status') {
  exitWith(
    ssh(
      `echo "live: $(basename "$(readlink -f ${APP}/current)") ($(cat ${APP}/current/REVISION))";` +
        ` echo "service: $(systemctl is-active tiyulplus-web)";` +
        ` echo "health: $(curl -s -m 5 http://127.0.0.1:4800/api/health)";` +
        ` echo releases:; ls -1t ${APP}/releases`,
    ),
  );
} else if (cmd === 'logs') {
  exitWith(ssh('journalctl -u tiyulplus-web -n 100 -f', { tty: true }));
} else if (cmd === 'release') {
  release();
} else {
  console.error('usage: npm run deploy [-- rollback [id] | status | logs]');
  process.exit(1);
}

function release() {
  // Only what is committed is deployed, so an uncommitted fix would silently
  // not be in the release.
  if (git('status', '--porcelain') && process.env.DEPLOY_DIRTY !== '1') {
    console.error('Uncommitted changes. Only the committed HEAD is deployed - commit first,');
    console.error('or run with DEPLOY_DIRTY=1 to deploy HEAD without them.');
    process.exit(1);
  }
  const sha = git('rev-parse', 'HEAD');
  if (!git('branch', '-r', '--contains', sha)) {
    console.log(`note: ${sha.slice(0, 7)} is not pushed yet - deploying it anyway`);
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const id = `${stamp}-${sha.slice(0, 7)}`;
  console.log(`deploying ${id} to ${HOST}`);

  // autocrlf=false: with the Windows default, git archive hands the server CRLF
  // shell scripts, and bash fails on the first line.
  const archive = spawn('git', ['-c', 'core.autocrlf=false', 'archive', '--format=tar.gz', 'HEAD'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const remote = ssh(
    `set -e; d=${APP}/releases/${id}; mkdir -p "$d"; tar -xzf - -C "$d"; cd "$d"; bash deploy/release.sh ${sha}`,
    { stdin: 'pipe' },
  );
  archive.stdout.pipe(remote.stdin);
  archive.on('exit', (code) => {
    if (code !== 0) {
      console.error('git archive failed');
      remote.kill();
      process.exit(1);
    }
  });
  exitWith(remote);
}
