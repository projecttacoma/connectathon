const fs = require('fs');
const http = require('http');

async function getCQFMeasureList() {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:8080/cqf-ruler-r4/fhir/Measure", (res) => {
      
      if (res.statusCode != 200) {
        reject(`Status code ${res.statusCode} was unexpected when listing measures.`);
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const measureSearchBundle = JSON.parse(rawData);

          const measureListing = measureSearchBundle.entry.map((entry) => {
            let cmsId = entry.resource.identifier.find((identifier) => { return identifier.system == "http://hl7.org/fhir/cqi/ecqm/Measure/Identifier/cms" });
            let exmId = "EXM_UNKNOWN";
            if (cmsId) {
              exmId = `EXM_${cmsId.value}`
            }
            return {
              fullUrl: entry.fullUrl,
              id: entry.resource.id,
              exmId: exmId
            };
          });

          resolve(measureListing);
        } catch (e) {
          reject(`Failed to parse result from cqf-ruler: ${e.message}`);
          return;
        }
      });
    });
  });
}

async function getTestMeasureList() {
  let fpgDir = fs.readdirSync('./fhir-patient-generator/')
  let applicableMeasuresDirs = fpgDir.filter((dir) => { return dir.startsWith("EXM_") });
  applicableMeasuresDirs.map((measureDir) => {
    
  });

  return applicableMeasuresDirs;
}

async function calculateMeasures() {
  let cqfMeasures = await getCQFMeasureList();
  console.log(cqfMeasures);
  let testPatientMeasures = await getTestMeasureList();
  console.log(testPatientMeasures);
}


calculateMeasures();