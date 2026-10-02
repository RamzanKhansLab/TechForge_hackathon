import React, { useState } from 'react';
import { Share2, Copy, Check, Download, ShieldCheck, Globe, Code } from 'lucide-react';
import { analysisApi } from '../../services/api/analysisApi.js';

/**
 * ShareModal
 * Generates:
 * 1. Shareable read-only public report link
 * 2. Dynamic embeddable SVG trust badge markdown snippet
 * 3. Cryptographically signed audit export download
 */
export default function ShareModal({ analysis = {}, isOpen, onClose }) {
  const [isPublic, setIsPublic] = useState(Boolean(analysis?.isPublic));
  const [shareId, setShareId] = useState(analysis?.shareId || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && analysis) {
      setIsPublic(Boolean(analysis.isPublic));
      setShareId(analysis.shareId || '');
    }
  }, [isOpen, analysis]);

  if (!isOpen || !analysis) return null;

  const origin = window.location.origin;
  const shareUrl = shareId ? `${origin}/share/${shareId}` : '';
  const provenCount = analysis.summary?.proven || 0;
  const totalCount = analysis.summary?.claimed || 0;
  const githubUser = analysis.githubUsername || 'candidate';

  // Live SVG Badge Markdown snippet
  const badgeMarkdown = `[![SkillProof: ${provenCount}/${totalCount} Verified](${origin}/api/badge/${githubUser})](https://github.com/${githubUser})`;


  async function handleToggleShare() {
    setLoading(true);
    try {
      const nextState = !isPublic;
      const res = await analysisApi.share(analysis._id, nextState);
      const data = res?.data || res;
      setIsPublic(Boolean(data?.isPublic));
      setShareId(data?.shareId || '');
    } catch (e) {
      alert(e.message || 'Failed to update share visibility');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text, setCopied) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadExport() {
    try {
      const res = await analysisApi.exportData(analysis._id);
      const exportJson = res?.data || res;
      const blob = new Blob([JSON.stringify(exportJson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skillproof-audit-${analysis.githubUsername || 'report'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Failed to generate audit export');
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--color-rule,#ded7c8)] pb-4 mb-6">
          <div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#2e6b3e]">
              Audit Verification Ledger
            </span>
            <h3 className="font-serif text-xl font-bold text-[var(--color-ink,#1a1815)] mt-1">
              Share &amp; Export Verifiable Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center border border-[var(--color-rule,#ded7c8)] bg-white text-xs font-mono hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Public Link Visibility Toggle */}
          <div className="p-4 border border-[var(--color-rule,#ded7c8)] bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-sm font-bold text-[var(--color-ink,#1a1815)]">Public Shareable Link</h4>
                <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-0.5 font-sans">
                  Anyone with the link can view verified evidence without editing access.
                </p>
              </div>
              <button
                onClick={handleToggleShare}
                disabled={loading}
                className={`px-3 py-1.5 font-mono text-xs font-semibold border transition ${
                  isPublic
                    ? 'border-[#2e6b3e] bg-[#eef6f0] text-[#1c4728]'
                    : 'border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] text-[var(--color-ink-2,#4a443b)]'
                }`}
              >
                {loading ? 'Updating…' : isPublic ? 'Enabled (Public)' : 'Disabled (Private)'}
              </button>
            </div>

            {isPublic && shareUrl && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="input flex-1 font-mono text-xs bg-[var(--color-paper,#FAF7F0)] border-[var(--color-rule,#ded7c8)] px-3 py-2"
                />
                <button
                  onClick={() => handleCopy(shareUrl, setCopiedLink)}
                  className="btn font-mono text-xs py-2 px-3 border border-[var(--color-rule,#ded7c8)] bg-white inline-flex items-center gap-1.5"
                >
                  {copiedLink ? <Check size={14} className="text-[#2e6b3e]" /> : <Copy size={14} />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* GitHub README SVG Embed Badge */}
          <div className="p-4 border border-[var(--color-rule,#ded7c8)] bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Code size={16} className="text-[var(--color-ink-2,#4a443b)]" />
              <h4 className="font-serif text-sm font-bold text-[var(--color-ink,#1a1815)]">
                GitHub README Dynamic Badge
              </h4>
            </div>
            <p className="text-xs text-[var(--color-ink-2,#4a443b)] mb-3 font-sans">
              Embed verifiable proof directly in your GitHub profile README:
            </p>
            <div className="flex items-center gap-3 p-3 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] mb-3 font-mono text-xs">
              <span className="px-2 py-0.5 bg-[#1a1815] text-white text-[10px] font-bold">
                SkillProof
              </span>
              <span className="text-[#2e6b3e] font-semibold">
                ✓ {provenCount}/{totalCount} Skills Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={badgeMarkdown}
                className="input flex-1 font-mono text-[11px] bg-[var(--color-paper,#FAF7F0)] border-[var(--color-rule,#ded7c8)] px-3 py-2"
              />
              <button
                onClick={() => handleCopy(badgeMarkdown, setCopiedBadge)}
                className="btn font-mono text-xs py-2 px-3 border border-[var(--color-rule,#ded7c8)] bg-white inline-flex items-center gap-1.5"
              >
                {copiedBadge ? <Check size={14} className="text-[#2e6b3e]" /> : <Copy size={14} />}
                {copiedBadge ? 'Copied' : 'Copy Markdown'}
              </button>
            </div>
          </div>

          {/* Cryptographic JSON Audit Export */}
          <div className="p-4 border border-[var(--color-rule,#ded7c8)] bg-white flex items-center justify-between">
            <div>
              <h4 className="font-serif text-sm font-bold text-[var(--color-ink,#1a1815)]">Cryptographic Audit Ledger Export</h4>
              <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-0.5 font-sans">
                Full JSON evidence ledger with deterministic SHA-256 hashes for third-party auditing.
              </p>
            </div>
            <button
              onClick={handleDownloadExport}
              className="btn font-mono text-xs py-2 px-3 border border-[var(--color-rule,#ded7c8)] bg-white inline-flex items-center gap-1.5 hover:bg-[var(--color-paper,#FAF7F0)]"
            >
              <Download size={14} /> Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
