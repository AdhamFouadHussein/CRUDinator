const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SchemaField = require('../models/SchemaField');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get schema fields
router.get('/schema', auth, async (req, res) => {
  try {
    const fields = await SchemaField.find({ active: true }).sort('order');
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add schema field
router.post('/schema', auth, async (req, res) => {
  try {
    const uniqueSchemaNames = [...new Set(req.body.map(item => item.schemaName))];
    const schemaName = uniqueSchemaNames[0];
    const count = await SchemaField.countDocuments({ schemaName });

    const fields = req.body.map((field, index) => ({
      ...field,
      order: count + index
    }));

    const savedFields = await SchemaField.insertMany(fields);
    res.status(201).json(savedFields);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

// Delete schema field
router.delete('/schema/:shcemaName/:id', auth, async (req, res) => {
  try {
    await SchemaField.findByIdAndDelete(req.params.id);
    res.json({ message: 'Field removed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create dynamic document
router.post('/', auth, async (req, res) => {
  try {
    const { schemaName, customFields } = req.body;
    console.log('schema:', req.body);
    const fields = await SchemaField.find({ schemaName, active: true });

    // Validate data against schema
    const validatedData = {};
    for (const field of fields) {
      const value = customFields[field.name];
      if (field.required && !value) {
        throw new Error(`${field.label || field.name} is required`);
      }
      if (value) {
        validatedData[field.name] = value;
      }
    }

    // Create document in MongoDB
    const result = await mongoose.connection.collection(schemaName).insertOne({
      ...validatedData,
      createdAt: new Date()
    });

    res.status(201).json({ _id: result.insertedId });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

// Update a collection's fields
router.patch('/:schemaName/:id', auth, async (req, res) => {
  try {
    const { schemaName, id } = req.params;
    const updateData = req.body.customFields;

    const result = await mongoose.connection.collection(schemaName).updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

// Get documents based on schemaName
router.get('/:schemaName', auth, async (req, res) => {
  try {
    const schemaName = req.params.schemaName;
    const documents = await mongoose.connection.collection(schemaName).find().toArray();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:schemaName/:id', auth, async (req, res) => {
  try {
    const { schemaName, id } = req.params;
    const result = await mongoose.connection.collection(schemaName).deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
module.exports = router;