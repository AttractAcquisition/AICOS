import React, { useState, useEffect, useMemo } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Search, Plus, Edit2, Trash2, X, Save, Copy, ExternalLink, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AA_CURRENT_REPOSITORY } from '../data/aa-current-repository';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string;
  children?: FileNode[];
}

const FileRow = ({ 
  node, 
  level, 
  onEdit, 
  onDelete,
  cloudUrl,
  defaultOpen = false,
}: { 
  node: FileNode; 
  level: number; 
  onEdit: (n: FileNode) => void; 
  onDelete: (id: string) => void;
  cloudUrl?: string;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  const openLocalFile = (filePath: string) => {
    let rawPath = filePath.trim();

    if (rawPath.includes('localhost:8080')) {
      rawPath = rawPath.split('localhost:8080').pop() || '';
    }

    if (!rawPath.startsWith('/')) {
      rawPath = '/' + rawPath;
    }

    const finalUrl = `file://${rawPath.replace(/^file:\/\//, '')}`;
    const encodedUrl = encodeURI(finalUrl);

    const link = document.createElement('a');
    link.href = encodedUrl;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openCloudFile = (url: string) => {
    window.open(url, '_blank', 'noopener');
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'file') {
      if (cloudUrl) {
        openCloudFile(cloudUrl);
        return;
      }
      if (node.path) {
        openLocalFile(node.path);
        return;
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ marginLeft: level * 16 }}>
      <div 
        className="hover-bg"
        onClick={handleLaunch}
        style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '6px 12px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {node.type === 'folder' && (
            isOpen ? <ChevronDown size={14} color="var(--grey2)" /> : <ChevronRight size={14} color="var(--grey2)" />
          )}
          {node.type === 'folder' ? (
            <Folder size={16} color="var(--teal)" fill={isOpen ? "var(--teal)" : "none"} style={{ opacity: 0.8 }} />
          ) : (
            <File size={16} color="var(--grey2)" style={{ marginLeft: node.type === 'file' ? 24 : 0 }} />
          )}
          <span style={{ 
            fontSize: 13, 
            fontFamily: node.type === 'folder' ? 'DM Mono' : 'Barlow',
            color: node.type === 'folder' ? 'var(--white)' : 'var(--grey)',
            fontWeight: node.type === 'folder' ? 500 : 400
          }}>
            {node.name}
          </span>
          {node.type === 'file' && (
            <ExternalLink size={12} color="var(--grey2)" />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          {node.type === 'file' && node.path && (
            <button
              onClick={() => openLocalFile(node.path!)}
              title="Open local file"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--grey2)',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'DM Mono',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <ExternalLink size={12} /> Local
            </button>
          )}
          {node.type === 'file' && cloudUrl && (
            <button
              onClick={() => openCloudFile(cloudUrl)}
              title="Open cloud copy"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--grey2)',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'DM Mono',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <Cloud size={12} /> Cloud
            </button>
          )}
          <Edit2 size={12} style={{ color: 'var(--grey2)', cursor: 'pointer' }} onClick={() => onEdit(node)} />
          <Trash2 size={12} style={{ color: '#ff4d4d', cursor: 'pointer' }} onClick={() => onDelete(node.id)} />
        </div>
      </div>
      
      {isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FileRow key={child.id} node={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Documents() {
  const [nodes, setNodes] = useState<FileNode[]>(() => {
    const saved = localStorage.getItem('aa_repo_data');
    return saved ? JSON.parse(saved) : (AA_CURRENT_REPOSITORY as unknown as FileNode[]);
  });
  const [cloudFiles, setCloudFiles] = useState<Record<string, string>>({});
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Partial<FileNode> | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('aa_repo_data');
    if (saved) return;
    localStorage.setItem('aa_repo_data', JSON.stringify(AA_CURRENT_REPOSITORY));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('app_files')
        .select('file_name, file_path')

      if (!mounted || !data) return;
      const next: Record<string, string> = {};
      data.forEach((row: { file_name: string; file_path: string }) => {
        if (row.file_name && row.file_path && !next[row.file_name]) {
          next[row.file_name] = row.file_path;
        }
      })
      setCloudFiles(next);
    })()
    return () => { mounted = false }
  }, []);

  const saveToLocal = (newNodes: FileNode[]) => {
    setNodes(newNodes);
    localStorage.setItem('aa_repo_data', JSON.stringify(newNodes));
  };

  const deleteNode = (id: string) => {
    const filterNodes = (list: FileNode[]): FileNode[] => 
      list.filter(n => n.id !== id).map(n => ({
        ...n,
        children: n.children ? filterNodes(n.children) : undefined
      }));
    saveToLocal(filterNodes(nodes));
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    
    // Simple parser: Each line is a file.
    // Set VITE_DOCUMENTS_BASE_PATH in your .env to override the default local path.
    const BASE_PATH = import.meta.env.VITE_DOCUMENTS_BASE_PATH || '/Users/alex/Desktop/AA/Current/';
    const lines = bulkText.split('\n').filter(l => l.trim());
    
    const newItems: FileNode[] = lines.map((line, i) => ({
      id: `bulk-${Date.now()}-${i}`,
      name: line.split('/').pop() || line,
      type: 'file',
      path: line.includes('/') ? line : `${BASE_PATH}${line.trim()}`
    }));

    saveToLocal([...nodes, ...newItems]);
    setBulkText('');
    setIsPanelOpen(false);
  };

  const upsertNode = () => {
    if (!editingNode?.name) return;
    const existing = nodes.find(n => n.id === editingNode.id);
    if (existing) {
      saveToLocal(nodes.map(n => n.id === editingNode.id ? (editingNode as FileNode) : n));
    } else {
      saveToLocal([...nodes, editingNode as FileNode]);
    }
    setIsPanelOpen(false);
    setEditingNode(null);
  };

  const filterTree = (list: FileNode[], term: string): FileNode[] => {
    if (!term.trim()) return list;
    const needle = term.toLowerCase();
    return list.reduce<FileNode[]>((acc, node) => {
      const nameMatch = node.name.toLowerCase().includes(needle);
      if (node.type === 'folder' && node.children) {
        const children = filterTree(node.children, term);
        if (nameMatch || children.length) {
          acc.push({ ...node, children });
        }
        return acc;
      }
      if (nameMatch) acc.push(node);
      return acc;
    }, []);
  };

  const filteredNodes = useMemo(() => filterTree(nodes, search), [nodes, search]);

  return (
    <div className="page-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 32, marginBottom: 4 }}>Repository</h1>
          <p style={{ color: 'var(--grey2)', fontSize: 14 }}>Direct file access for Attract Acquisition assets.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingNode({ id: Date.now().toString(), type: 'file' }); setIsPanelOpen(true); }}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      <div className="card" style={{ padding: '20px', minHeight: 'calc(100vh - 220px)' }}>
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--grey2)' }} />
          <input 
            className="input" 
            placeholder="Search filenames..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredNodes
            .map(node => (
              <FileRow 
                key={node.id} 
                node={node} 
                level={0} 
                onEdit={(n) => { setEditingNode(n); setIsPanelOpen(true); }} 
                onDelete={deleteNode}
                cloudUrl={node.type === 'file' ? cloudFiles[node.name] : undefined}
                defaultOpen={Boolean(search.trim())}
              />
            ))}
        </div>
      </div>

      {isPanelOpen && (
        <>
          <div onClick={() => setIsPanelOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
          <div className="card" style={{ 
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', 
            zIndex: 101, borderRadius: 0, padding: '32px', display: 'flex', 
            flexDirection: 'column', gap: 24, animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 24 }}>Manage Assets</h2>
              <X size={24} cursor="pointer" onClick={() => setIsPanelOpen(false)} />
            </div>

            {/* Single Add */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid var(--border2)', paddingBottom: 24 }}>
              <div className="label">Asset Name</div>
              <input className="input" value={editingNode?.name || ''} onChange={e => setEditingNode({...editingNode, name: e.target.value})} />
              
              <div className="label">Hard Drive Path</div>
              <input className="input" value={editingNode?.path || ''} onChange={e => setEditingNode({...editingNode, path: e.target.value})} />
              
              <button className="btn-primary" onClick={upsertNode}><Save size={16} /> Save Item</button>
            </div>

            {/* Bulk Add */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Copy size={14} /> Bulk Import (Paste List)
              </div>
              <textarea 
                className="input" 
                style={{ flex: 1, resize: 'none', fontSize: 12, fontFamily: 'DM Mono' }} 
                placeholder="Paste your list of files here..."
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <button className="btn-ghost" onClick={handleBulkImport}>Process Bulk List</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .hover-bg:hover { background: var(--bg3); }
      `}</style>
    </div>
  );
}
