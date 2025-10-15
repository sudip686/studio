// File: api/geodata.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Point to the 'public' directory where your files are located
    const dataDir = path.join(process.cwd(), 'public');

    // Read the files from the public folder
    const blockModel = JSON.parse(fs.readFileSync(path.join(dataDir, 'BlockModel.geojson'), 'utf8'));
    const assayData = JSON.parse(fs.readFileSync(path.join(dataDir, 'assay_data.geojson'), 'utf8'));
    const lithologyData = JSON.parse(fs.readFileSync(path.join(dataDir, 'lithology_data.geojson'), 'utf8'));
    
    // Combine them into a single response
    const geoData = {
      block_model_data: blockModel,
      assay_data: assayData,
      lithology_data: lithologyData,
    };

    // Send the combined data as a JSON response
    res.status(200).json(geoData);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Error reading geo data files.' });
  }
}