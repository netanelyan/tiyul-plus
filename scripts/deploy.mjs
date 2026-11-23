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
 *   npm run deploy -- db             install/update the database stack (deploy/db/)
 *   npm run deploy -- sql <file>     run a SQL file against the database, in one transaction
 *
 * The host is the `tiyul-vps` entry in ~/.ssh/config (override: DEPLOY_HOST).
 *
 * Written in Node rather than bash because on Windows `bash` on the PATH is the
 * WSL launcher, which has neither this repo's git state nor the ssh config.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const HOST = process.env.DEPLOY_HOST || 'tiyul-vps';
const APP = '/opt/tiyulplus-web';
const DB = '/opt/tiyulplus-db';
const DB_PSQL = `docker compose --project-directory ${DB} -f ${DB}/compose.yml exec -T db psql -U postgres -d postgres`;
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
} else if (cmd === 'db') {
  db();
} else if (cmd === 'sql') {
  sql(arg);
} else if (cmd === 'release') {
  release();
} else {
  console.error('usage: npm run deploy [-- rollback [id] | status | logs | db | sql <file>]');
  process.exit(1);
}

function requireClean() {
  // Only what is committed is deployed, so an uncommitted fix would silently
  // not be in the release.
  if (git('status', '--porcelain') && process.env.DEPLOY_DIRTY !== '1') {
    console.error('Uncommitted changes. Only the committed HEAD is deployed - commit first,');
    console.error('or run with DEPLOY_DIRTY=1 to deploy HEAD without them.');
    process.exit(1);
  }
}

/**
 * git archive of HEAD, piped into a remote command that reads it on stdin.
 * `afterSuccess` runs only when the remote command exits 0, before this exits.
 */
function shipHead(remoteCmd, paths = [], afterSuccess = null) {
  // autocrlf=false: with the Windows default, git archive hands the server CRLF
  // shell scripts, and bash fails on the first line.
  const archive = spawn('git', ['-c', 'core.autocrlf=false', 'archive', '--format=tar.gz', 'HEAD', ...paths], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const remote = ssh(remoteCmd, { stdin: 'pipe' });
  archive.stdout.pipe(remote.stdin);
  archive.on('exit', (code) => {
    if (code !== 0) {
      console.error('git archive failed');
      remote.kill();
      process.exit(1);
    }
  });
  if (!afterSuccess) return exitWith(remote);
  remote.on('exit', (code) => {
    if (code !== 0) process.exit(code ?? 1);
    afterSuccess();
  });
}

function db() {
  requireClean();
  shipHead(
    `set -e; d=$(mktemp -d); trap 'rm -rf "$d"' EXIT; tar -xzf - -C "$d"; bash "$d/deploy/db/install.sh"`,
    ['deploy/db', 'emails/auth-magic-link.html'],
  );
}

/**
 * The replacement for Supabase's SQL editor. One transaction (`-1`), so a
 * file that fails halfway leaves nothing behind; PostgREST picks up the new
 * schema by itself (the event trigger in deploy/db/init/00-roles.sh).
 */
function sql(file) {
  if (!file || !fs.existsSync(file)) {
    console.error('usage: npm run deploy -- sql <file.sql>');
    process.exit(1);
  }
  exitWith(ssh(`${DB_PSQL} -v ON_ERROR_STOP=1 -1`, { stdin: fs.openSync(file, 'r') }));
}

function release() {
  requireClean();
  const sha = git('rev-parse', 'HEAD');
  if (!git('branch', '-r', '--contains', sha)) {
    console.log(`note: ${sha.slice(0, 7)} is not pushed yet - deploying it anyway`);
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const id = `${stamp}-${sha.slice(0, 7)}`;
  console.log(`deploying ${id} to ${HOST}`);

  shipHead(`set -e; d=${APP}/releases/${id}; mkdir -p "$d"; tar -xzf - -C "$d"; cd "$d"; bash deploy/release.sh ${sha}`, [], () => {
    // Pages that are new or changed in this release, to Bing and the other
    // IndexNow engines. It never fails the deploy - the release is already live.
    spawnSync(process.execPath, ['scripts/indexnow.mjs'], { stdio: 'inherit' });
    process.exit(0);
  });
}
