import { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import './ResumeUpload.css';
export default function ResumeUpload({file,onChange,maxSize=5,disabled=false}) {
  const input = useRef(null); const [dragging,setDragging] = useState(false);
  function drop(event) { event.preventDefault(); setDragging(false); if (!disabled && event.dataTransfer.files[0]) onChange(event.dataTransfer.files[0]); }
  return <div><label className="label" htmlFor="resume-file">Resume PDF <span className="font-normal text-muted">*</span></label><div className={`resume-drop ${dragging ? 'resume-dragging' : ''}`} onDragOver={e => {e.preventDefault(); if (!disabled) setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <input ref={input} id="resume-file" type="file" accept="application/pdf,.pdf" className="sr-only" disabled={disabled} onChange={e => onChange(e.target.files[0] || null)}/>
    {file ? <div className="flex items-center gap-4 text-left"><span className="rounded-xl bg-[#e8f0df] p-3 text-[#547541]"><FileText size={25}/></span><div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-muted">{(file.size/1024/1024).toFixed(2)} MB · PDF document</p></div><button type="button" aria-label="Remove resume" disabled={disabled} className="rounded-lg p-2 text-muted hover:bg-white" onClick={() => {onChange(null); input.current.value='';}}><X size={18}/></button></div> : <button type="button" disabled={disabled} onClick={() => input.current.click()} className="flex w-full flex-col items-center py-5"><span className="mb-4 rounded-xl border border-line bg-white p-3 text-[#5b7850]"><UploadCloud size={25}/></span><span className="text-sm font-semibold">Click to upload <span className="font-normal text-muted">or drag and drop</span></span><span className="mt-2 text-xs text-muted">Text-based PDF · Up to {maxSize} MB · 15 pages</span></button>}
    </div></div>;
}
