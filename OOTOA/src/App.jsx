import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { loginGoogle, logout, setDoc, getDocument } from './firebase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);

  const auth = getAuth();

  // This listener solves Issue A and B
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // If user deletes account or logs out, currentUser becomes null automatically
    });
    return () => unsubscribe(); // Cleanup listener on unmount
  }, [auth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home({ user }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogin = async () => {
    const result = await loginGoogle();
    if (result.isNew) {
      if (result) {
        await setDoc(`profiles/${result.user.uid}`, {
          uid: result.user.uid,
          name: result.user.displayName,
        });
      }
    }
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start writing your lore here...</p>',
    // If user is null, editable is false (Reader mode)
    // If user exists, editable is true (Editor mode)
    editable: false,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const profile = await getDocument(`profiles/${user.uid}`);
          // Set admin state based on the database field
          setIsAdmin(!!profile?.admin);
        } catch (e) {
          console.error('Error checking admin:', e);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isAdmin);
    }
  }, [isAdmin, editor]);

  useEffect(() => {
    const loadLore = async () => {
      const data = await getDocument('lore/world-history');
      if (data && data.body && editor) {
        // This puts the Firebase content into the editor
        editor.commands.setContent(data.body);
      }
    };

    if (editor) {
      loadLore();
    }
  }, [editor]);

  const handleSave = async () => {
    if (!editor || !isAdmin) return;

    setIsSaving(true);
    const content = editor.getHTML(); // Capture the current editor state

    try {
      // Saving to a specific lore document (e.g., 'world-history')
      await setDoc('lore/world-history', {
        body: content,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.uid,
      });
      alert('Lore archived successfully!');
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save lore.');
    } finally {
      setIsSaving(false);
    }
  };

  const EditorToolbar = ({ editor }) => {
    if (!editor) return null;
    return (
      <>
        <div className="toolbar">
          <button onClick={() => editor.chain().focus().toggleBold().run()}>
            Bold
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}>
            Italic
          </button>
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <div
        className="container"
        style={{ padding: '20px', textAlign: 'center' }}
      >
        <h1>Firebase Connection Test</h1>

        <div style={{ margin: '20px' }}>
          {!user ? (
            <button onClick={handleLogin}>1. Login with Google</button>
          ) : (
            <div>
              <p>Welcome, {user.displayName}!</p>
              <button onClick={logout}>Logout</button>
              <button
                onClick={() => {
                  checkAdmin(user);
                }}
              >
                Check admin
              </button>
            </div>
          )}
        </div>
      </div>
      <p>Status: {user ? 'Logged In' : 'Logged Out'}</p>
      {/*isAdmin ? (
        <p style={{ color: 'green' }}>✨ Admin Mode: You can edit this lore.</p>
      ) : (
        <p style={{ color: 'gray' }}>📖 Reader Mode: View only.</p>
      )*/}
      <div
        className="editor-container"
        style={{ border: '1px solid #ccc', marginTop: '20px' }}
      >
        {/* The Toolbar should only show if the user is logged in */}
        {isAdmin && <EditorToolbar editor={editor} />}

        <EditorContent editor={editor} />
      </div>
    </>
  );
}

async function checkAdmin(user) {
  try {
    const result = await getDocument(`profiles/${user.uid}`);
    if (result.admin) {
      alert('You are admin');
    } else {
      alert('not an admin');
    }
  } catch (e) {
    alert('getAdminerror ' + JSON.stringify(e));
  }
}
