// Citation Badge UI Component
import React, { useState } from 'react';

export interface CitationAnchor {
  fileHash: string;
  fileName: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  text: string;
  confidence: number;
}

export interface CitationBadgeProps {
  citationId: string;
  claim: string;
  anchors: CitationAnchor[];
  verified: boolean;
  onVerify: (citationId: string, verified: boolean) => void;
  onViewSource: (anchor: CitationAnchor) => void;
  onEdit: (citationId: string) => void;
  className?: string;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  citationId,
  claim,
  anchors,
  verified,
  onVerify,
  onViewSource,
  onEdit,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);

  const handleVerify = () => {
    onVerify(citationId, !verified);
  };

  const handleViewSource = (anchor: CitationAnchor) => {
    onViewSource(anchor);
  };

  const handleEdit = () => {
    onEdit(citationId);
  };

  const getStatusColor = () => {
    if (verified) return 'bg-green-100 text-green-800 border-green-200';
    if (anchors.length === 0) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getStatusIcon = () => {
    if (verified) return '✓';
    if (anchors.length === 0) return '⚠️';
    return '?';
  };

  const getStatusText = () => {
    if (verified) return 'Verified';
    if (anchors.length === 0) return 'No Citations';
    return 'Unverified';
  };

  return (
    <div className={`citation-badge ${className}`}>
      {/* Main Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
        <span className="mr-2">{getStatusIcon()}</span>
        <span className="mr-2">{getStatusText()}</span>
        <span className="text-xs opacity-75">({anchors.length} sources)</span>
        
        <div className="ml-2 flex space-x-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg 
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
          
          <button
            onClick={handleVerify}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            title={verified ? 'Mark as unverified' : 'Mark as verified'}
          >
            {verified ? '✗' : '✓'}
          </button>
          
          <button
            onClick={handleEdit}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            title="Edit citation"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
          {/* Claim Text */}
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Claim:</h4>
            <p className="text-sm text-gray-600 italic">"{claim}"</p>
          </div>

          {/* Anchors */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Sources:</h4>
              <button
                onClick={() => setShowAnchors(!showAnchors)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showAnchors ? 'Hide' : 'Show'} Details
              </button>
            </div>
            
            {anchors.length === 0 ? (
              <p className="text-sm text-red-600">No sources found for this claim</p>
            ) : (
              <div className="space-y-2">
                {anchors.map((anchor, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">
                        {anchor.fileName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Page {anchor.pageNumber} • Confidence: {(anchor.confidence * 100).toFixed(1)}%
                      </div>
                      {showAnchors && (
                        <div className="text-xs text-gray-600 mt-1">
                          "{anchor.text.substring(0, 100)}..."
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewSource(anchor)}
                      className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleVerify}
              className={`px-3 py-1 text-xs rounded ${
                verified 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {verified ? 'Mark Unverified' : 'Mark Verified'}
            </button>
            
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
            >
              Edit Citation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for inline use
export const CompactCitationBadge: React.FC<{
  citationId: string;
  verified: boolean;
  anchorCount: number;
  onVerify: (citationId: string, verified: boolean) => void;
  onView: (citationId: string) => void;
}> = ({ citationId, verified, anchorCount, onVerify, onView }) => {
  const getStatusColor = () => {
    if (verified) return 'bg-green-100 text-green-800';
    if (anchorCount === 0) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = () => {
    if (verified) return '✓';
    if (anchorCount === 0) return '⚠️';
    return '?';
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
      <span className="mr-1">{getStatusIcon()}</span>
      <span className="mr-1">{anchorCount}</span>
      <button
        onClick={() => onVerify(citationId, !verified)}
        className="ml-1 hover:bg-black hover:bg-opacity-10 rounded px-1"
        title={verified ? 'Mark unverified' : 'Mark verified'}
      >
        {verified ? '✗' : '✓'}
      </button>
      <button
        onClick={() => onView(citationId)}
        className="ml-1 hover:bg-black hover:bg-opacity-10 rounded px-1"
        title="View details"
      >
        👁️
      </button>
    </span>
  );
};

// Citation List Component
export const CitationList: React.FC<{
  citations: Array<{
    id: string;
    claim: string;
    anchors: CitationAnchor[];
    verified: boolean;
  }>;
  onVerify: (citationId: string, verified: boolean) => void;
  onViewSource: (anchor: CitationAnchor) => void;
  onEdit: (citationId: string) => void;
}> = ({ citations, onVerify, onViewSource, onEdit }) => {
  const unverifiedCount = citations.filter(c => !c.verified).length;
  const noCitationCount = citations.filter(c => c.anchors.length === 0).length;

  return (
    <div className="citation-list">
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Citation Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Total:</span> {citations.length}
          </div>
          <div>
            <span className="font-medium">Unverified:</span> 
            <span className="ml-1 text-yellow-600">{unverifiedCount}</span>
          </div>
          <div>
            <span className="font-medium">No Citations:</span> 
            <span className="ml-1 text-red-600">{noCitationCount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {citations.map(citation => (
          <CitationBadge
            key={citation.id}
            citationId={citation.id}
            claim={citation.claim}
            anchors={citation.anchors}
            verified={citation.verified}
            onVerify={onVerify}
            onViewSource={onViewSource}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
};

