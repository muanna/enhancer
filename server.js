/*

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const axios = require('axios');
const Replicate = require('replicate');

const app = express();
const port = process.env.PORT || 3000;

// Configure Replicate client
const replicate = new Replicate({
  auth: 'r8_cTOaAEMWA7UXf7l7KsK8fFrnPTa5sVp4WZ0lx',
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Directories setup
const outputDir = path.join(__dirname, 'outputs');
fs.mkdirSync(outputDir, { recursive: true });

// Serve static files

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(outputDir));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
});

// File cleanup utility
const safeDeleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file ${filePath}:`, err);
    });
  }
};

// Process endpoint
app.post('/process-images', upload.array('images'), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const processedFiles = [];
    const zipFileName = `processed-${Date.now()}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipFilePath);

    archive.pipe(output);

    // Process each file
    for (const file of req.files) {
      try {
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        
        const prediction = await replicate.predictions.create({
          version: "8aa841ec",
          input: {
            img: imageUrl,
            scale: 2,
            version: "v1.4"
          }
        });

        const completed = await prediction.wait();
        
        if (completed.status === 'succeeded') {
          const response = await axios.get(completed.output, { responseType: 'stream' });
          archive.append(response.data, { name: `enhanced_${file.originalname}` });
          processedFiles.push({ original: file.path, processed: completed.output });
        } else {
          throw new Error(`Processing failed for ${file.originalname}`);
        }
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        safeDeleteFile(file.path);
      }
    }

    // Finalize zip
    await archive.finalize();
    console.log(`Zip file created: ${zipFilePath}`);

    // Wait for zip completion
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    // Cleanup files
    req.files.forEach((file) => safeDeleteFile(file.path));
    processedFiles.forEach((file) => safeDeleteFile(file.processed));

    res.json({ zipUrl: `/output/${zipFileName}` });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});*/

/*
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const Replicate = require('replicate');

const app = express();
const port = process.env.PORT || 3000;

const replicate = new Replicate({
  auth: 'r8_cTOaAEMWA7UXf7l7KsK8fFrnPTa5sVp4WZ0lx',
});

// Configure storage for base64 conversion
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Set up output directory
const outputDir = path.join(__dirname, 'output');
fs.mkdirSync(outputDir, { recursive: true });


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
});
// New processing endpoint with direct file handling
app.post('/process-images', upload.array('images'), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const processedFiles = [];
    const zipFileName = `processed-${Date.now()}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipFilePath);

    archive.pipe(output);

    // Process files in parallel
    await Promise.all(req.files.map(async (file) => {
      try {
        // Convert to base64 for Replicate API
        const imageBuffer = file.buffer.toString('base64');
        const dataURI = `data:${file.mimetype};base64,${imageBuffer}`;

        // Run GFPGAN processing
        const output = await replicate.run(
          "xinntao/gfpgan@8aa841ec",
          {
            input: {
              img: dataURI,
              scale: 2,
              version: "v1.4"
            }
          }
        );

        // Download enhanced image
        const response = await fetch(output);
        const processedBuffer = Buffer.from(await response.arrayBuffer());
        
        // Add to ZIP
        archive.append(processedBuffer, { name: `enhanced_${file.originalname}` });
        processedFiles.push(file.originalname);
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
      }
    }));

    // Finalize ZIP
    await archive.finalize();

    // Wait for ZIP completion
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    res.json({ zipUrl: `/output/${zipFileName}` });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Serve output files
app.use('/output', express.static(outputDir));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('No ngrok required! Files are processed directly through Replicate API');
});*/
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const port = 3000;
const apiKey = "SG_963aeb76177c12a7";
const segmindEndpoint = "https://api.segmind.com/v1/codeformer";
const outputDir = path.join(__dirname, "output");
fs.mkdirSync(outputDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/process-images", upload.single("images"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const base64Image = req.file.buffer.toString("base64");
        
        const response = await axios.post(segmindEndpoint, {
            image: base64Image
        }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            responseType: "stream"
        });

        const outputFilePath = path.join(outputDir, `${Date.now()}_enhanced.png`);
        const writer = fs.createWriteStream(outputFilePath);
        response.data.pipe(writer);

        writer.on("finish", () => {
            res.json({ zipUrl: `/download?file=${path.basename(outputFilePath)}` });
        });

        writer.on("error", (err) => {
            console.error("Error saving processed image:", err);
            res.status(500).json({ message: "Error saving processed image" });
        });
    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).json({ message: "Error processing image" });
    }
});

app.get("/download", (req, res) => {
    const filePath = path.join(outputDir, req.query.file);
    res.download(filePath, (err) => {
        if (err) {
            res.status(500).json({ message: "Error downloading file" });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});