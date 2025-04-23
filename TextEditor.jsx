import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import './TextEditor.css';
import {
  WhatsappShareButton,
  TwitterShareButton,
  EmailShareButton,
  WhatsappIcon,
  TwitterIcon,
  EmailIcon,
} from 'react-share';

const TextEditor = () => {
  const { id: documentId } = useParams();
  const [socket, setSocket] = useState(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Establish socket connection
  useEffect(() => {
    const s = io('http://localhost:4000');
    setSocket(s);
    
    // Log when connected to the server
    s.on('connect', () => {
      console.log("Connected to server");
    });

    // Cleanup socket connection on component dismount
    return () => s.disconnect(); 
  }, []);  // Empty dependency array ensures this effect runs only once

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate({ editor }) {
      if (!isEditorReady) return;
      const json = editor.getJSON();
      socket?.emit('send-changes', json);  // Emit changes to the server
    },
  });

  useEffect(() => {
    if (!socket || !editor) return;

    // Load the document when the socket connects
    socket.once('load-document', (document) => {
      editor.commands.setContent(document);
      setIsEditorReady(true);
    });

    // Request the document from the backend
    socket.emit('get-document', documentId);

    // Receive and apply changes from other clients
    socket.on('receive-changes', (delta) => {
      if (editor && isEditorReady) {
        // Just update if different — avoid resetting unnecessarily
        const currentContent = JSON.stringify(editor.getJSON());
        const incomingContent = JSON.stringify(delta);
        if (currentContent !== incomingContent) {
          editor.commands.setContent(delta);
        }
      }
    });

    // Periodically save the document to MongoDB
    const interval = setInterval(() => {
      if (editor && isEditorReady) {
        socket.emit('save-document', editor.getJSON());
      }
    }, 2000);

    return () => clearInterval(interval);  // Cleanup interval on dismount
  }, [socket, editor, documentId, isEditorReady]);

  const handleSave = () => {
    if (editor && isEditorReady) {
      socket.emit('save-document', editor.getJSON());
      alert('✅ Document saved!');
    }
  };

  const handleRetry = () => {
    window.location.reload();  // Reload the document
  };

  const handleNew = () => {
    window.location.href = `/documents/${Date.now()}`;  // Create new document
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to clear the content?')) {
      editor.commands.setContent({ type: 'doc', content: [] });  // Clear content
    }
  };

  const handleShare = () => {
    const shareURL = window.location.href;
    navigator.clipboard.writeText(shareURL)
      .then(() => {
        const button = document.activeElement;
        button.textContent = "✅ Link Copied!";
        setTimeout(() => {
          button.textContent = "🔗 Share";
        }, 2000);
      })
      .catch(() => {
        alert('❌ Failed to copy the link.');
      });
  };

  if (!editor) return <div className="editor-container">Loading editor...</div>;

  return (
    <div className="editor-container">
      <header className="editor-header">
        <h2>📝 Collaborative Editor</h2>
        <div className="editor-buttons">
          <button onClick={handleSave}>💾 Save</button>
          <button onClick={handleRetry}>🔄 Retry</button>
          <button onClick={handleDelete}>🗑️ Clear</button>
          <button onClick={handleNew}>📄 New</button>
          <button onClick={handleShare}>🔗 Share</button>
        </div>
      </header>

      {/* Animated Share URL input field */}
      <div className="share-url-wrapper">
        <input
          type="text"
          value={window.location.href}
          readOnly
          className="share-url"
          onClick={(e) => e.target.select()}
        />
      </div>

      <div className="social-share-buttons">
        <WhatsappShareButton url={window.location.href} title="Check out this collaborative doc!">
          <WhatsappIcon size={32} round />
        </WhatsappShareButton>

        <TwitterShareButton url={window.location.href} title="Check out this collaborative doc!">
          <TwitterIcon size={32} round />
        </TwitterShareButton>

        <EmailShareButton url={window.location.href} subject="Shared Document" body="Here's a doc to check out: ">
          <EmailIcon size={32} round />
        </EmailShareButton>
      </div>

      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};

export default TextEditor;
