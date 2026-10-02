import http from "http";

const data = JSON.stringify({
  employees: 50,
  days: 60,
  basePatternsCount: 3,
  leaveRatio: 5,
  correctionRequestRatio: 20,
});

const options = {
  hostname: "localhost",
  port: 4000,
  path: "/api/maintenance/seed",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on("end", () => {
    console.log("No more data in response.");
  });
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
