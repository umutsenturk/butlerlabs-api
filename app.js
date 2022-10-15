const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const app = express();
const bodyParser = require("body-parser");
const formidable = require("formidable");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));

const apiBaseUrl = "https://app.butlerlabs.ai/api";

const port = 3000;


app.post("/get-test", async (req, res) => {
  await new Promise((r) => setTimeout(r, 5000));
  res.send({ message: `${req.headers.file_location} file done.` });
});


app.post("/get-json", async (req, res) => {
  var form = await new formidable.IncomingForm();
  const formData = await new FormData();
  await form.parse(req, (err, fields, files) => {
    formData.append("files", fs.createReadStream(files["files"]["filepath"]));

    uploadFiles(
      req.headers.file_location,
      req.headers.q_id,
      formData,
      files["files"]["filepath"].replace("/tmp/", "")
    )
      .then((upl_id) => getExtractionResults(upl_id, req.headers.q_id))
      .then((success) => res.send(success));
  });
});


const uploadFiles = async (file_location, q_id, file, file_name) => {
  console.log("BASLADI");
  const uploadUrl = `${apiBaseUrl}/queues/${q_id}/uploads`;
  file["_streams"][0] = file["_streams"][0].replace(
    "application/octet-stream",
    "application/pdf"
  );
  file["_streams"][0] = file["_streams"][0].replace(file_name, file_location);
  console.log(file["_streams"][0]);

  return await axios
    .post(uploadUrl, file, {
      headers: {
        ...authHeaders,
        ...file.getHeaders(),
        "content-type": "application/pdf",
      },
    })
    .then((success) => success.data.uploadId)
    .catch((err) => console.log(err.response.data));
};


const getExtractionResults = async (uploadId, queueId) => {
  // URL to fetch the result
  const extractionResultsUrl = `${apiBaseUrl}/queues/${queueId}/extraction_results`;
  const params = { uploadId };
  // Simple helper function for use while polling on results
  const sleep = (waitTimeInMs) =>
    new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

  // Make sure to poll every few seconds for results.
  // For smaller documents this will typically take only a few seconds
  let extractionResults = null;
  while (!extractionResults) {
    const resultApiResponse = await axios.get(extractionResultsUrl, {
      headers: { ...authHeaders },
      params,
    });

    const firstDocument = resultApiResponse.data.items[0];
    const extractionStatus = firstDocument.documentStatus;
    // If extraction has not yet completed, sleep for 1 second
    if (extractionStatus !== "Completed") {
      await sleep(1000);
    } else {
      return resultApiResponse.data;
    }
  }
};


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
