const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

// Create server instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",  // React frontend URL
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/collab-doc')
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((error) => console.error('MongoDB connection failed:', error));

// Document model
const Document = mongoose.model('Document', new mongoose.Schema({
  _id: String,
  content: mongoose.Schema.Types.Mixed, // Store JSON from TipTap editor
}));

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When a user requests a document
  socket.on('get-document', async (documentId) => {
    try {
      let document = await Document.findById(documentId);
      if (!document) {
        document = await Document.create({
          _id: documentId,
          content: { type: 'doc', content: [] },  // Create an empty document if it doesn't exist
        });
      }

      socket.join(documentId);  // Join the socket room specific to the document
      socket.emit('load-document', document.content);  // Send current document content

      // Listen for changes from the editor
      socket.on('send-changes', (delta) => {
        socket.broadcast.to(documentId).emit('receive-changes', delta);  // Broadcast changes to other users
      });

      // Save the document periodically when requested
      socket.on('save-document', async (data) => {
        await Document.findByIdAndUpdate(documentId, { content: data });
        console.log('Document saved to DB');
      });

    } catch (error) {
      console.error('Error getting/creating document:', error);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
