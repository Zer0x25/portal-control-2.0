const fs = require("node:fs");

// Parent runner renews off-scenario. Each VU captures the latest credential.
module.exports.assignWorkerToken = function (context, _events, done) {
  try {
    const file = process.env.LOAD_WORKER_TOKEN_FILE;
    if (file) context.vars.workerToken = fs.readFileSync(file, "utf8").trim();
    done();
  } catch (error) {
    done(error);
  }
};
