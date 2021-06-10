const path = require("path");
const os = require("os");
const {promises: fs, constants} = require("fs");
const {getOptions} = require("loader-utils");
const pjson = require("./package.json");
const findCacheDir = require("find-cache-dir");
const crypto = require("crypto");
const util = require("util");
const child_process = require("child_process");

const exec = util.promisify(child_process.exec);

const thunk = findCacheDir({name: pjson.name, thunk: true});

const sha = (x) => crypto.createHash("sha256").update(x).digest("hex");

const fileExists = async (file) => {
	try {
		await fs.access(file, constants.F_OK);
		return true;
	}catch(e) {
		return false;
	}
};

const withTempDir = async (fn) => {
	const dir = await fs.mkdtemp(await fs.realpath(os.tmpdir()) + path.sep);
	try {
		return await fn(dir);
	}finally {
		fs.rmdir(dir, {recursive: true});
	}
};

const getVersionHash = (() => {
	let prom = undefined;

	return () => prom = (prom || (async () => {
		const {stdout: versionString} = await exec("ffmpeg -version");

		return sha(sha(versionString) + sha(pjson.version));
	})());
})();

const getCacheDir = (() => {
	const cacheDir = thunk();

	let prom = undefined;
	return () => prom = (prom || (async () => {
		await fs.mkdir(cacheDir, {recursive: true});

		return cacheDir;
	})());
})();

module.exports = function (source) {
	const {filters} = getOptions(this);
	const callback = this.async();
	(async () => {
		const cacheFile = path.join(await getCacheDir(), sha(await getVersionHash() + sha(source) + sha(this.request) + sha(JSON.stringify(getOptions(this)))));
		const data = await (async () => {
			if (await fileExists(cacheFile)) {
				return fs.readFile(cacheFile);
			}else {
				const res = await withTempDir(async (dir) => {
					const fileName = path.join(dir, "input");
					const outputFileName = path.join(dir, "output.wav");

					await fs.writeFile(fileName, source);
					await exec(`ffmpeg -i ${fileName} ${filters} ${outputFileName}`);

					return fs.readFile(outputFileName);
				});
				await fs.writeFile(cacheFile, res);
				return res;
			}
		})();

		return data;
	})().then((res) => callback(undefined, res), (err) => callback(err));
};

module.exports.raw = true;
