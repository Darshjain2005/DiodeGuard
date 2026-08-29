// Add this route to api.js to allow Python to trigger Socket.IO events
router.post('/log-activity', async (req, res) => {
  const { type, text } = req.body;
  if (!type || !text) return res.status(400).json({error: 'Missing type or text'});
  await logActivity(req.io, type, text);
  res.json({success: true});
});
