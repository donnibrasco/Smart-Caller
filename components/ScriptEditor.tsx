
import React, { useState } from 'react';
import { FileText, Save, Plus, Copy, Trash2, Variable, Layout } from 'lucide-react';
import { Script } from '../types';

interface ScriptEditorProps {
  scripts: Script[];
  onSave: (updatedScripts: Script[]) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ scripts, onSave }) => {
  const [selectedScriptId, setSelectedScriptId] = useState<string>(scripts[0]?.id || '');
  const [editMode, setEditMode] = useState(false);
  
  const activeScript = scripts.find(s => s.id === selectedScriptId);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeScript) return;
    const updated = scripts.map(s => s.id === activeScript.id ? { ...s, content: e.target.value } : s);
    onSave(updated);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeScript) return;
    const updated = scripts.map(s => s.id === activeScript.id ? { ...s, name: e.target.value } : s);
    onSave(updated);
  };

  const insertVariable = (variable: string) => {
    if (!activeScript) return;
    const textArea = document.getElementById('script-textarea') as HTMLTextAreaElement;
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = activeScript.content;
    const newText = text.substring(0, start) + variable + text.substring(end);
    
    const updated = scripts.map(s => s.id === activeScript.id ? { ...s, content: newText } : s);
    onSave(updated);
    
    // Reset cursor is tricky in React without refs, but for now this works
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const createNewScript = () => {
    const newScript: Script = {
      id: `script-${Date.now()}`,
      name: 'New Untitled Script',
      content: 'Hi {FirstName}, this is {MyName} from {MyCompany}. How are you?',
      isDefault: false,
      tags: ['General']
    };
    onSave([...scripts, newScript]);
    setSelectedScriptId(newScript.id);
  };

  const deleteScript = () => {
    if (scripts.length <= 1) {
      alert("You must have at least one script.");
      return;
    }
    if (window.confirm("Delete this script?")) {
      const updated = scripts.filter(s => s.id !== selectedScriptId);
      onSave(updated);
      setSelectedScriptId(updated[0].id);
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar List */}
      <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center">
            <Layout size={18} className="mr-2" /> Scripts
          </h2>
          <button onClick={createNewScript} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-600 transition-colors">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {scripts.map(script => (
            <div 
              key={script.id}
              onClick={() => setSelectedScriptId(script.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                selectedScriptId === script.id 
                  ? 'bg-white border-blue-400 shadow-sm ring-1 ring-blue-100' 
                  : 'bg-transparent border-transparent hover:bg-slate-100'
              }`}
            >
              <div className="font-semibold text-sm text-slate-900">{script.name}</div>
              <div className="text-xs text-slate-500 mt-1 truncate">{script.content}</div>
              {script.isDefault && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-full">
                  Default
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col h-full">
        {activeScript ? (
          <>
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white">
               <input 
                 type="text" 
                 value={activeScript.name}
                 onChange={handleNameChange}
                 className="text-xl font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 placeholder-slate-300 w-full"
                 placeholder="Script Name"
               />
               <div className="flex items-center space-x-2">
                  <button 
                    onClick={deleteScript}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Script"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    <Save size={16} />
                    <span>Auto-Saved</span>
                  </button>
               </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center space-x-2 overflow-x-auto">
               <span className="text-xs font-bold text-slate-500 uppercase mr-2">Insert Variable:</span>
               {['{FirstName}', '{LastName}', '{Company}', '{Title}', '{MyName}', '{MyCompany}'].map(v => (
                 <button 
                   key={v}
                   onClick={() => insertVariable(v)}
                   className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                 >
                   {v}
                 </button>
               ))}
            </div>

            <div className="flex-1 p-6 bg-slate-100">
               <div className="bg-white rounded-lg shadow-sm border border-slate-200 h-full flex flex-col">
                  <textarea 
                    id="script-textarea"
                    value={activeScript.content}
                    onChange={handleContentChange}
                    className="flex-1 w-full h-full p-6 text-base text-slate-800 outline-none resize-none font-sans leading-relaxed"
                    placeholder="Start typing your script here..."
                  />
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p>Select a script to edit</p>
          </div>
        )}
      </div>
    </div>
  );
};
