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
  let measureDirInfo = applicableMeasuresDirs.map((measureDir) => {
    return {
      exmId: measureDir,
      path: `./fhir-patient-generator/${measureDir}/patients-r4`
    }
  });

  return measureDirInfo;
}

async function loadTestDataFolder(testDataFolder) {
  // use data in all subfolders. ex. numerator, denominator, etc.
  let subfolders = fs.readdirSync(testDataFolder, { withFileTypes: true })
    .filter((dir) => { return dir.isDirectory() })
    .map((dir) => { return dir.name })

  for (let subfolder of subfolders) {
    let subfolderPath = testDataFolder + '/' + subfolder;
    console.log(subfolderPath);
    let patientBundles = fs.readdirSync(subfolderPath)
    for (let patientBundleName of patientBundles) {
      if (!patientBundleName.endsWith(".json")) continue;
      console.log(`${subfolderPath}/${patientBundleName}`)
      await loadPatientBundle(`${subfolderPath}/${patientBundleName}`)
    }
  }
}

async function loadPatientBundle(patientBundlePath) {
  return new Promise((resolve, reject) => {
    let req = http.request("http://localhost:8080/cqf-ruler-r4/fhir",
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        }
      }, (res) => {
        if (res.statusCode != 200) {
          reject(`Status code ${res.statusCode} was unexpected when posting bundle.`);
          return;
        } else {
          resolve();
        }
      });

    let bundleStream = fs.createReadStream(patientBundlePath);
    bundleStream.pipe(req);
  });
}

async function calculateMeasures() {
  let cqfMeasures = await getCQFMeasureList();
  console.log(cqfMeasures);
  let testPatientMeasures = await getTestMeasureList();
  console.log(testPatientMeasures);
  loadTestDataFolder('./fhir-patient-generator/EXM_124/patients-r4');
}


calculateMeasures();