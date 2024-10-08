const express = require('express');
const router = express.Router();
const SinhalaDictionary = require('../models/SinhalaDictionary');

// Add a new word
router.post('/addWord', async (req, res) => {
  const { sinhalaWord, englishWords } = req.body;

  if (!sinhalaWord) {
    return res.status(400).json({ message: 'Sinhala word is required' });
  }

  const filteredEnglishWords = englishWords.filter(word => word.trim() !== '');

  if (filteredEnglishWords.length === 0) {
    return res.status(400).json({ message: 'At least one English word is required' });
  }

  try {
    const newWord = new SinhalaDictionary({
      sinhalaWord,
      englishWords: filteredEnglishWords,
      status: filteredEnglishWords.map(() => 'pending')
    });
    await newWord.save();
    res.status(201).json({ message: 'Word added successfully', word: newWord });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get all words
router.get('/getWords', async (req, res) => {
  try {
    const words = await SinhalaDictionary.find();
    res.status(200).json(words);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Search words by Sinhala word, English word, or status
router.get('/search', async (req, res) => {
  const { query } = req.query;

  try {
    const regex = new RegExp(query, 'i'); 

    const words = await SinhalaDictionary.find({
      $or: [
        { sinhalaWord: regex }, 
        { englishWords: { $elemMatch: { $regex: regex } } }, 
        { status: { $elemMatch: { $regex: regex } } } 
      ]
    });

    res.status(200).json(words);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get only accepted words
router.get('/accepted', async (req, res) => {
  try {
    const words = await SinhalaDictionary.find({ 'status': 'accepted' });
    res.status(200).json(words);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Accept a specific English word
router.patch('/acceptWord/:id/:index', async (req, res) => {
  const { id, index } = req.params;

  try {
    const word = await SinhalaDictionary.findById(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    word.status[index] = 'accepted';
    await word.save();
    res.status(200).json({ message: 'Word accepted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Reject a specific English word within a Sinhala word object
router.patch('/rejectWord/:id/:index', async (req, res) => {
  const { id, index } = req.params;
  try {
    const word = await SinhalaDictionary.findById(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Remove the rejected English word and corresponding status
    word.englishWords.splice(index, 1);
    word.status.splice(index, 1);

    if (word.englishWords.length === 0) {
      // If all English words are rejected, delete the Sinhala word
      await SinhalaDictionary.findByIdAndDelete(id);
      return res.status(200).json({ message: 'All words rejected; Sinhala word deleted successfully' });
    } else {
      // Otherwise, save the updated Sinhala word
      await word.save();
      return res.status(200).json({ message: 'English word rejected successfully', word });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete a word
router.delete('/deleteWord/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const word = await SinhalaDictionary.findByIdAndDelete(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    res.status(200).json({ message: 'Word deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.put('/updateWord/:id', async (req, res) => {
  const { id } = req.params;
  const { sinhalaWord, englishWords } = req.body;

  const filteredEnglishWords = englishWords.filter(word => word.trim() !== '');

  if (!sinhalaWord || filteredEnglishWords.length === 0) {
    return res.status(400).json({ message: 'Sinhala word and at least one English word are required' });
  }

  try {
    const word = await SinhalaDictionary.findById(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    word.sinhalaWord = sinhalaWord;
    word.englishWords = filteredEnglishWords;
    word.status = filteredEnglishWords.map(() => 'pending'); // Reset status to pending

    await word.save();
    res.status(200).json({ message: 'Word updated successfully', word });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;