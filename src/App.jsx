import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BrainCircuit, 
  Upload, 
  FileText, 
  Layout, 
  BookOpen, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Tag, 
  Quote, 
  Download, 
  Play, 
  ChevronRight, 
  ChevronDown, 
  Library,
  Search,
  RefreshCw,
  List,
  X,
  Copy,
  Filter,
  FileDiff,
  MessageSquare,
  Send,
  Save,
  FolderOpen,
  Layers,
  Grid,
  Maximize2,
  Globe,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  Code,
  FileCode,
  Package
} from 'lucide-react';

// --- API CONFIGURATION ---
const apiKey = ""; // Injected at runtime

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

// --- AI SERVICE ---

const generateTaxonomy = async (previewData, userGuide, taxonomyMode) => {
  let promptInstruction = "";
  if (taxonomyMode === 'broad') {
    promptInstruction = "Create a taxonomy of 3 to 5 BROAD, high-level categories (e.g., 'Ecology', 'Management'). Avoid specific details.";
  } else if (taxonomyMode === 'specific') {
    promptInstruction = "Create a taxonomy of 10 to 20 HIGHLY SPECIFIC, nuanced categories (e.g., 'Nitrogen Mineralization', 'Mechanical Shrub Removal'). Be granular.";
  } else {
    promptInstruction = "Create a taxonomy of 5 to 10 STANDARD academic categories (e.g., 'Soil Nutrients', 'Grazing Impact'). Balance breadth and depth.";
  }

  const prompt = `
    I have ${previewData.length} academic papers about: "${userGuide}".
    Sample titles: ${JSON.stringify(previewData.slice(0, 20).map(p => p.title))} 
    
    TASK: ${promptInstruction}
    
    RETURN JSON ONLY: { "tags": ["Tag 1", "Tag 2", ...] }
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text).tags || [];
  } catch (e) {
    console.error("Taxonomy Error", e);
    return ["General Ecology", "Management", "Unsorted"];
  }
};

const analyzePaperDeeply = async (text, userGuide, availableTags) => {
  const safeText = text.substring(0, 20000); 
  
  const prompt = `
    Analyze this academic text carefully: "${safeText}..."
    
    Context: My thesis is "${userGuide}".
    Available Tags: ${JSON.stringify(availableTags)}
    
    TASK:
    1. Assign the TOP 3 Most Relevant Tags from the list (Select at least 1, but NO MORE THAN 3).
    2. Alignment (Supports/Contradicts/Neutral).
    3. Extract Metadata:
       - Real Title (Look for the actual paper title inside the text).
       - Publication Year.
       - Authors.
    4. Deep Read (BE VERY DETAILED):
       - Full Abstract: Extract the complete abstract text verbatim.
       - Main Points: Write a detailed, multi-paragraph summary of the methods and results.
       - Conclusions: Write a detailed, multi-paragraph summary of the authors' final conclusions.
    5. Quotes: Extract exactly 10 powerful, direct quotes relevant to the thesis.
    
    RETURN JSON ONLY:
    {
      "selectedTags": ["String", "String"],
      "alignment": "String",
      "realTitle": "String",
      "year": "String",
      "authors": "String",
      "fullAbstract": "String",
      "mainPoints": "String (Markdown supported)",
      "conclusions": "String (Markdown supported)",
      "quotes": ["Quote 1", "Quote 2", ... "Quote 10"],
      "abntDraft": "String"
    }
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });
    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    
    if (!Array.isArray(result.selectedTags)) result.selectedTags = [result.selectedTag || "Unsorted"];
    // Enforce max 3 tags for AI only
    if (result.selectedTags.length > 3) result.selectedTags = result.selectedTags.slice(0, 3);
    if (!Array.isArray(result.quotes)) result.quotes = [];
    
    return result;
  } catch (e) {
    return { 
      selectedTags: ["Unsorted"], 
      alignment: "Neutral", 
      realTitle: "Unknown Title", 
      year: "Unknown", 
      quotes: [], 
      fullAbstract: "Error processing abstract.",
      mainPoints: "Error processing points.",
      conclusions: "Error processing conclusions.",
      abntDraft: "Error processing reference." 
    };
  }
};

const generateSynthesisReport = async (articles, tag) => {
  const subset = articles.filter(a => !tag || a.tags.includes(tag));
  const context = JSON.stringify(subset.map(a => ({ title: a.realTitle, year: a.year, alignment: a.alignment, conclusions: a.conclusions })).slice(0, 40)); 
  const prompt = `Literature Review Synthesis. Topic: ${tag || "General"}. Papers: ${subset.length}. Data: ${context}. Write critical analysis (Markdown). Sections: Executive Summary, Strengths, Weaknesses, Gaps, Suggestions.`;
  try {
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (e) { return "Failed to generate synthesis."; }
};

const generateComparativeReport = async (thesis, articles) => {
  const libraryContext = JSON.stringify(articles.map(a => ({ author: a.authors, year: a.year, alignment: a.alignment, arguments: a.mainPoints, conclusions: a.conclusions })).slice(0, 50)); 
  const prompt = `Comparative Analysis Report. THESIS: "${thesis}". EVIDENCE (${articles.length} papers): ${libraryContext}. TASK: Report validating/critiquing thesis. Sections: Validation, Nuance, Refinement, Smoking Guns.`;
  try {
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (e) { return "Failed to generate comparative analysis."; }
};

const chatWithLibrary = async (history, query, articles) => {
  const libraryContext = articles.map(a => `--- DOCUMENT START ---\nID: ${a.id}\nTitle: ${a.realTitle} (${a.year})\nAuthor: ${a.authors}\nCONTENT:\n${a.fullText}\n--- DOCUMENT END ---`).join("\n");
  const prompt = `Research Assistant. Context: ${articles.length} papers. LIBRARY: ${libraryContext}. HISTORY: ${JSON.stringify(history.slice(-3))}. QUESTION: "${query}". INSTRUCTIONS: Answer strictly from context. Cite [Author, Year].`;
  try {
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (e) { return "Error communicating with AI."; }
};

// --- COMPONENTS ---

const Navigation = ({ activeTab, setTab, onSave, onExportStatic }) => {
  const tabs = [
    { id: 'dashboard', label: 'Library', icon: Layout },
    { id: 'tag-manager', label: 'Tags', icon: Tag }, 
    { id: 'topics', label: 'Topics Explorer', icon: Layers }, 
    { id: 'analysis', label: 'Thesis Check', icon: FileDiff }, 
    { id: 'synthesis', label: 'Gap Analysis', icon: BrainCircuit },
    { id: 'chat', label: 'Chat w/ Docs', icon: MessageSquare }, 
    { id: 'bibliography', label: 'Bibliography', icon: BookOpen },
  ];

  return (
    <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-6 flex-shrink-0 z-20 shadow-xl h-full overflow-y-auto no-scrollbar">
      <div className="mb-4 mt-2">
        <Library className="text-emerald-400 h-8 w-8" />
      </div>
      <div className="flex flex-col gap-4 w-full items-center">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`p-3 rounded-xl transition-all group relative w-12 h-12 flex items-center justify-center ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <tab.icon size={24} />
            <span className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-auto pb-4 space-y-4 flex flex-col items-center w-full">
        <div className="w-10 h-[1px] bg-slate-700 my-2"></div>
        <button onClick={onSave} className="p-3 text-emerald-400 hover:text-white transition-colors group relative w-12 h-12 flex items-center justify-center"><Save size={24} /><span className="absolute left-14 bg-emerald-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Save Workspace</span></button>
        <button onClick={onExportStatic} className="p-3 text-sky-400 hover:text-white transition-colors group relative w-12 h-12 flex items-center justify-center"><Globe size={24} /><span className="absolute left-14 bg-sky-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Export Static Site</span></button>
      </div>
    </div>
  );
};

const TagManagerView = ({ taxonomy, setTaxonomy, articles, setArticles, onNavigateToTag }) => {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag && !taxonomy.includes(newTag)) {
      setTaxonomy([...taxonomy, newTag]);
      setNewTag("");
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    if (confirm(`Delete tag "${tagToDelete}"? This will remove it from all articles.`)) {
      setTaxonomy(taxonomy.filter(t => t !== tagToDelete));
      // Remove from articles
      const updatedArticles = articles.map(a => ({
        ...a,
        tags: a.tags.filter(t => t !== tagToDelete)
      }));
      setArticles(updatedArticles);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <Tag className="text-indigo-600" /> Tag & Taxonomy Manager
        </h2>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="flex gap-4">
            <input 
              type="text" 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Create a new tag..."
              className="flex-1 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <button 
              onClick={handleAddTag}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} /> Add Tag
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {taxonomy.map(tag => {
            const count = articles.filter(a => a.tags.includes(tag)).length;
            return (
              <div key={tag} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center group hover:shadow-md transition-all">
                <button 
                  onClick={() => onNavigateToTag(tag)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <Tag size={16} className="text-indigo-500" />
                  <span className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">{tag}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full flex items-center gap-1">
                    {count} papers <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                  className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ArticleDetailModal = ({ article, onClose, onUpdate, taxonomy, setTaxonomy }) => {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState("");
  const [newCustomTag, setNewCustomTag] = useState("");

  if (!article) return null;

  // TAG LOGIC
  const handleTagRemove = (tagToRemove) => {
    const newTags = article.tags.filter(t => t !== tagToRemove);
    onUpdate(article.id, { tags: newTags });
  };

  const handleTagAdd = (newTag) => {
    if (!article.tags.includes(newTag)) {
      onUpdate(article.id, { tags: [...article.tags, newTag] });
    }
    setIsEditingTags(false);
  };

  const handleCreateAndAddTag = () => {
    if (newCustomTag && !taxonomy.includes(newCustomTag)) {
      // Update global taxonomy
      setTaxonomy(prev => [...prev, newCustomTag]);
      // Add to this article
      handleTagAdd(newCustomTag);
      setNewCustomTag("");
    } else if (newCustomTag) {
      handleTagAdd(newCustomTag);
      setNewCustomTag("");
    }
  };

  const handleAlignmentChange = (newAlign) => {
    onUpdate(article.id, { alignment: newAlign });
  };

  // QUOTE LOGIC
  const handleAddQuote = () => {
    if (newQuoteText.trim()) {
      onUpdate(article.id, { quotes: [...(article.quotes || []), newQuoteText.trim()] });
      setNewQuoteText("");
    }
  };

  const handleDeleteQuote = (idx) => {
    const newQuotes = article.quotes.filter((_, i) => i !== idx);
    onUpdate(article.id, { quotes: newQuotes });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-5xl bg-white h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-start">
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              {/* ALIGNMENT DROPDOWN */}
              <div className="relative group">
                <select 
                  value={article.alignment}
                  onChange={(e) => handleAlignmentChange(e.target.value)}
                  className={`appearance-none text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider cursor-pointer outline-none border-2 border-transparent transition-all hover:shadow-sm ${
                    article.alignment.includes('Support') ? 'bg-emerald-100 text-emerald-700 hover:border-emerald-200' :
                    article.alignment.includes('Contradict') ? 'bg-rose-100 text-rose-700 hover:border-rose-200' : 'bg-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <option value="Supports Thesis">Supports Thesis</option>
                  <option value="Contradicts Thesis">Contradicts Thesis</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>

              {/* TAGS */}
              <div className="flex flex-wrap gap-2 items-center">
                {article.tags.map(t => (
                  <div key={t} className="group flex items-center gap-1 text-xs font-mono bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors">
                    {t}
                    <button onClick={() => handleTagRemove(t)} className="hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <X size={10} />
                    </button>
                  </div>
                ))}
                
                <div className="relative">
                  <button 
                    onClick={() => setIsEditingTags(!isEditingTags)}
                    className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full hover:bg-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <Plus size={10} /> Tag
                  </button>
                  {isEditingTags && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto p-1">
                      <div className="p-2 border-b border-slate-100">
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={newCustomTag}
                            onChange={(e) => setNewCustomTag(e.target.value)}
                            placeholder="New tag..."
                            className="w-full text-xs p-2 border rounded outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAddTag()}
                          />
                          <button onClick={handleCreateAndAddTag} className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"><Plus size={14} /></button>
                        </div>
                      </div>
                      {taxonomy.filter(t => !article.tags.includes(t)).map(t => (
                        <button
                          key={t}
                          onClick={() => handleTagAdd(t)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{article.realTitle}</h2>
            <div className="text-slate-500 text-sm flex gap-4">
              <span className="font-bold">{article.year}</span>
              <span>{article.authors}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-10 overflow-y-auto flex-1">
          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={18} /> Full Abstract
            </h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-serif text-lg">
              {article.fullAbstract || article.abstract}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4">Detailed Main Points & Methods</h3>
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed">
                 <div dangerouslySetInnerHTML={{ __html: (article.mainPoints || "").replace(/\n/g, '<br/>') }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4">Detailed Conclusions</h3>
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: (article.conclusions || "").replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Quote size={18} /> 10 Key Citations & Quotes
            </h3>
            
            {/* Add Quote Input */}
            <div className="mb-6 flex gap-3">
              <textarea 
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="Paste a new quote here..."
                className="flex-1 p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-12 resize-none"
              />
              <button 
                onClick={handleAddQuote}
                className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold text-sm"
              >
                <Plus size={16} /> Add
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {article.quotes?.map((quote, idx) => (
                <div key={idx} className="bg-indigo-50 p-5 rounded-lg border-l-4 border-indigo-400 relative group transition-all hover:bg-indigo-100 hover:shadow-sm">
                  <p className="italic text-indigo-900 mb-3 text-lg leading-relaxed">"{quote}"</p>
                  <div className="text-xs text-indigo-500 font-bold flex justify-between items-center border-t border-indigo-200 pt-2">
                    <div className="flex items-center gap-2">
                      <span>Quote #{idx + 1}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(`"${quote}" (${article.authors?.split(';')[0]?.split(',')[0] || "Unknown"}, ${article.year})`)}
                        className="flex items-center gap-1 hover:text-indigo-800 bg-white/50 px-2 py-1 rounded"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                    <button 
                      onClick={() => handleDeleteQuote(idx)}
                      className="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {(!article.quotes || article.quotes.length === 0) && <p className="text-slate-400 italic">No quotes extracted yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// ... (TopicExplorerView, ComparativeAnalysisView, ChatView, SynthesisView, BibliographyView - unchanged logic)
const TopicExplorerView = ({ articles, setSelectedArticle }) => {
  const [activeTopic, setActiveTopic] = useState(null);
  const allTopics = useMemo(() => [...new Set(articles.flatMap(a => a.tags))].sort(), [articles]);
  useEffect(() => { if (allTopics.length > 0 && !activeTopic) setActiveTopic(allTopics[0]); }, [allTopics]);
  const topicArticles = useMemo(() => (!activeTopic ? [] : articles.filter(a => a.tags.includes(activeTopic))), [articles, activeTopic]);

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0 no-scrollbar">
        <div className="p-4 border-b border-slate-100 bg-slate-50"><h2 className="font-bold text-slate-800 flex items-center gap-2"><Layers size={18} className="text-indigo-600"/> Topics</h2><p className="text-xs text-slate-500 mt-1">{allTopics.length} Categories found</p></div>
        <div>{allTopics.map(topic => (
            <button key={topic} onClick={() => setActiveTopic(topic)} className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors flex justify-between items-center group ${activeTopic === topic ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
              <span className={`text-sm font-medium ${activeTopic === topic ? 'text-indigo-900' : 'text-slate-600'}`}>{topic}</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full group-hover:bg-slate-200 transition-colors">{articles.filter(a => a.tags.includes(topic)).length}</span>
            </button>
          ))}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-end justify-between"><div><h1 className="text-3xl font-bold text-slate-900">{activeTopic}</h1><p className="text-slate-500 mt-1">Found {topicArticles.length} related articles</p></div></div>
          <div className="space-y-4">{topicArticles.map(article => (
              <div key={article.id} onClick={() => setSelectedArticle(article)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all group flex gap-4">
                 <div className="w-16 flex-shrink-0 pt-1"><span className="block text-xl font-bold text-slate-300 font-mono text-center">{article.year}</span></div>
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${article.alignment.includes('Support') ? 'bg-emerald-100 text-emerald-700' : article.alignment.includes('Contradict') ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{article.alignment.split(' ')[0]}</span>{article.tags.filter(t => t !== activeTopic).slice(0,3).map(t => (<span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded truncate max-w-[100px]">{t}</span>))}</div>
                   <h3 className="font-bold text-lg text-slate-800 leading-snug mb-2 group-hover:text-indigo-600 transition-colors">{article.realTitle}</h3>
                   <p className="text-sm text-slate-600 line-clamp-2">{article.fullAbstract}</p>
                 </div>
                 <div className="flex items-center text-slate-300"><Maximize2 size={18} /></div>
              </div>
            ))}</div>
        </div>
      </div>
    </div>
  );
};

const ComparativeAnalysisView = ({ articles, userGuide, report, setReport }) => {
  const [loading, setLoading] = useState(false);
  const handleGenerate = async () => { setLoading(true); const result = await generateComparativeReport(userGuide, articles); setReport(result); setLoading(false); };
  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3"><FileDiff className="text-indigo-600" /> Thesis vs. Evidence Check</h2>
        {!report && (<div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8"><p className="text-slate-600 mb-4">Compare your thesis abstract against {articles.length} collected papers.</p><button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md">{loading ? <RefreshCw className="animate-spin" /> : <FileDiff />}{loading ? "Cross-referencing arguments..." : "Generate Comparative Report"}</button></div>)}
        {report && (<div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4"><div className="p-8 prose prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600"><div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/# (.*?)(<br\/>|$)/g, '<h1>$1</h1>') }} /></div></div>)}
      </div>
    </div>
  );
};

const ChatView = ({ articles, messages, setMessages }) => {
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false); const scrollRef = useRef(null);
  const handleSend = async () => { if (!input.trim()) return; const userMsg = { role: 'user', text: input }; setMessages(prev => [...prev, userMsg]); setInput(""); setLoading(true); const aiResponse = await chatWithLibrary(messages, input, articles); setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]); setLoading(false); };
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-2xl p-4 rounded-xl shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}><div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div></div></div>))}
        {loading && (<div className="flex justify-start"><div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-2 text-slate-500 text-sm"><RefreshCw className="animate-spin" size={16} /> Searching through full text of {articles.length} documents...</div></div>)}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto relative"><input type="text" className="w-full p-4 pr-12 rounded-full border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none shadow-sm" placeholder="Ask your library a question (Full-Text Search Enabled)..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} /><button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"><Send size={20} /></button></div>
      </div>
    </div>
  );
};

const SynthesisView = ({ articles, report, setReport }) => {
  const [loading, setLoading] = useState(false); const [selectedTag, setSelectedTag] = useState(null); const tags = useMemo(() => [...new Set(articles.flatMap(a => a.tags))], [articles]);
  const handleGenerate = async () => { setLoading(true); const result = await generateSynthesisReport(articles, selectedTag); setReport(result); setLoading(false); };
  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto"><h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3"><BrainCircuit className="text-indigo-600" /> Deep Gap Analysis</h2>
        {!report && (<div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8"><div className="flex gap-2 flex-wrap mb-4"><button onClick={() => setSelectedTag(null)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!selectedTag ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>General Synthesis (All)</button>{tags.map(t => (<button key={t} onClick={() => setSelectedTag(t)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTag === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>))}</div><button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">{loading ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}{loading ? "AI is analyzing weaknesses and gaps..." : "Generate Detailed Report"}</button></div>)}
        {report && (<div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4"><div className="p-8 prose prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600"><div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/# (.*?)(<br\/>|$)/g, '<h1>$1</h1>') }} /></div></div>)}
      </div>
    </div>
  );
};

const BibliographyView = ({ articles }) => {
  const copyAll = () => { const text = articles.map(a => a.abntDraft).join('\n\n'); navigator.clipboard.writeText(text); alert("Bibliography copied to clipboard!"); };
  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto bg-white min-h-[80vh] p-12 shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100"><h1 className="text-3xl font-bold text-slate-900">Referências Bibliográficas</h1><button onClick={copyAll} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-700 transition-colors text-sm font-bold"><Copy size={16} /> Copy All</button></div>
        <div className="space-y-6 font-serif text-slate-800">{articles.sort((a,b) => a.authors?.localeCompare(b.authors)).map((article, i) => (<div key={i} className="pl-8 -indent-8 leading-relaxed">{article.abntDraft || `${article.authors || "UNKNOWN"}. ${article.realTitle || article.title}. ${article.year || "s.d."}.`}</div>))}</div>
      </div>
    </div>
  );
};

// --- MAIN APP SHELL ---

export default function ResearchAssistant() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appState, setAppState] = useState('setup'); 
  const [files, setFiles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [userGuide, setUserGuide] = useState("Vachellia caven is a nurse plant, not just an invasive weed.");
  const [taxonomyMode, setTaxonomyMode] = useState('standard'); 
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [taxonomy, setTaxonomy] = useState([]); 
  const [showDevExport, setShowDevExport] = useState(false); // New state for developer export section

  // Filters State
  const [filterTag, setFilterTag] = useState(null);
  const [filterAlignment, setFilterAlignment] = useState(null);

  // PERSISTENT DATA STATE
  const [chatMessages, setChatMessages] = useState([]);
  const [compReport, setCompReport] = useState(null);
  const [synthReport, setSynthReport] = useState(null);

  const startProcessing = async () => {
    setAppState('processing');
    setProgress({ current: 0, total: files.length, status: 'Reading files...' });
    const rawDocs = [];
    for (const file of files) {
      const text = await file.text();
      rawDocs.push({ title: file.name, fullText: text, id: Math.random().toString(36).substr(2, 9) });
    }

    setProgress({ current: 0, total: rawDocs.length, status: 'Generating Taxonomy...' });
    const generatedTags = await generateTaxonomy(rawDocs, userGuide, taxonomyMode);
    setTaxonomy(generatedTags); 
    
    const finalArticles = [];
    for (let i = 0; i < rawDocs.length; i++) {
      setProgress({ current: i + 1, total: rawDocs.length, status: `Deep Analysis: ${rawDocs[i].title}...` });
      const analysis = await analyzePaperDeeply(rawDocs[i].fullText, userGuide, generatedTags);
      
      finalArticles.push({
        id: rawDocs[i].id,
        title: rawDocs[i].title, 
        abstract: rawDocs[i].fullText.slice(0, 300) + "...", 
        ...analysis,
        fullText: rawDocs[i].fullText,
        tags: analysis.selectedTags
      });
      await new Promise(r => setTimeout(r, 800)); 
    }

    setArticles(finalArticles);
    setChatMessages([{ role: 'ai', text: `I have analyzed ${finalArticles.length} papers using their full text. Ask me anything about them, and I'll cite my sources.` }]);
    setAppState('ready');
  };

  const handleUpdateArticle = (id, updates) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleNavigateToTag = (tag) => {
    setFilterTag(tag);
    setActiveTab('dashboard');
  };

  // --- DOWNLOAD SOURCE LOGIC ---
  const downloadString = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSource = (fileType) => {
    if (fileType === 'package') {
      const pkg = {
        name: "research-assistant",
        private: true,
        version: "1.0.0",
        type: "module",
        scripts: { "dev": "vite", "build": "vite build", "preview": "vite preview" },
        dependencies: { "lucide-react": "^0.292.0", "react": "^18.2.0", "react-dom": "^18.2.0" },
        devDependencies: { "@types/react": "^18.2.37", "@types/react-dom": "^18.2.15", "@vitejs/plugin-react": "^4.2.0", "autoprefixer": "^10.4.16", "postcss": "^8.4.31", "tailwindcss": "^3.3.5", "vite": "^5.0.0" }
      };
      downloadString(JSON.stringify(pkg, null, 2), 'package.json');
    } else if (fileType === 'html') {
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Research Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
  </body>
</html>`;
      downloadString(html, 'index.html');
    } else if (fileType === 'main') {
      const main = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
      downloadString(main, 'src/index.jsx');
    } else if (fileType === 'vite') {
      const vite = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`;
      downloadString(vite, 'vite.config.js');
    } else if (fileType === 'css') {
      const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar hiding */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}`;
      downloadString(css, 'src/index.css');
    }
  };

  // --- EXPORT STATIC SITE ---
  const handleExportStaticSite = () => {
    const safeData = JSON.stringify({
      articles,
      taxonomy,
      userGuide,
      chatMessages,
      compReport,
      synthReport
    }).replace(/</g, '\\u003c');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Research Workspace Backup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: system-ui, sans-serif; background: #f8fafc; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="text-slate-900">
    <div id="root" class="min-h-screen flex flex-col">
        <header class="bg-white border-b border-slate-200 p-6 shadow-sm sticky top-0 z-20">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold text-slate-800">Research Library (Static Backup)</h1>
                <div class="text-sm text-slate-500" id="count-display"></div>
            </div>
            <div class="mt-4 space-y-4">
                <div id="tag-filters" class="flex flex-wrap gap-2"></div>
                <div id="align-filters" class="flex items-center gap-2 pt-2 border-t border-slate-100"></div>
            </div>
        </header>

        <main class="p-8 flex-1 overflow-y-auto">
            <div id="grid-container" class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6"></div>
        </main>

        <div id="modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden items-center justify-center p-4 animate-in fade-in duration-200">
            <div class="w-full max-w-5xl bg-white h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div class="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-start">
                    <div id="modal-header-content" class="flex-1 pr-8"></div>
                    <button onclick="closeModal()" class="p-2 hover:bg-slate-200 rounded-full transition-colors"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div id="modal-body" class="p-8 space-y-10 overflow-y-auto flex-1"></div>
            </div>
        </div>
    </div>

    <script>
        const data = ${safeData};
        let activeTag = null;
        let activeAlign = null;

        function renderFilters() {
            // Tags
            const tagContainer = document.getElementById('tag-filters');
            const allTags = [...new Set(data.articles.flatMap(a => a.tags))].sort();
            let tagHtml = \`<button onclick="filterTag(null)" class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors \${!activeTag ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">All Topics</button>\`;
            allTags.forEach(tag => {
                tagHtml += \`<button onclick="filterTag('\${tag}')" class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors \${activeTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">\${tag}</button>\`;
            });
            tagContainer.innerHTML = tagHtml;

            // Align
            const alignContainer = document.getElementById('align-filters');
            alignContainer.innerHTML = \`
                <span class="font-bold text-sm text-slate-600 mr-2">Alignment:</span>
                <button onclick="filterAlign(null)" class="px-3 py-1 rounded-md border text-sm \${!activeAlign ? 'bg-slate-200 border-slate-300 font-bold' : 'border-transparent hover:bg-slate-100'}">All</button>
                <button onclick="filterAlign('Support')" class="px-3 py-1 rounded-md border text-sm \${activeAlign === 'Support' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'border-transparent hover:bg-slate-100'}">Supports</button>
                <button onclick="filterAlign('Contradict')" class="px-3 py-1 rounded-md border text-sm \${activeAlign === 'Contradict' ? 'bg-rose-100 border-rose-300 text-rose-800 font-bold' : 'border-transparent hover:bg-slate-100'}">Contradicts</button>
                <button onclick="filterAlign('Neutral')" class="px-3 py-1 rounded-md border text-sm \${activeAlign === 'Neutral' ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold' : 'border-transparent hover:bg-slate-100'}">Neutral</button>
            \`;
        }

        function filterTag(tag) { activeTag = tag; renderFilters(); renderGrid(); }
        function filterAlign(align) { activeAlign = align; renderFilters(); renderGrid(); }

        function renderGrid() {
            const container = document.getElementById('grid-container');
            const filtered = data.articles.filter(a => {
                const tagMatch = activeTag ? a.tags.includes(activeTag) : true;
                const alignMatch = activeAlign ? a.alignment.includes(activeAlign) : true;
                return tagMatch && alignMatch;
            });

            document.getElementById('count-display').innerText = \`Showing \${filtered.length} of \${data.articles.length} papers\`;

            container.innerHTML = filtered.map(a => \`
                <div onclick="openModal('\${a.id}')" class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all group">
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <div class="text-[10px] font-bold px-2 py-1 rounded uppercase inline-block whitespace-nowrap \${a.alignment.includes('Support') ? 'bg-emerald-100 text-emerald-700' : a.alignment.includes('Contradict') ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}">\${a.alignment.split(' ')[0]}</div>
                        <div class="flex-1 flex gap-1 overflow-hidden justify-end">
                            \${a.tags.slice(0,2).map(t => \`<span class="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 truncate">\${t}</span>\`).join('')}
                            \${a.tags.length > 2 ? \`<span class="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">+\${a.tags.length - 2}</span>\` : ''}
                        </div>
                    </div>
                    <h3 class="font-bold text-sm text-slate-800 mb-2 line-clamp-2">\${a.realTitle}</h3>
                    <div class="text-xs text-slate-400">\${a.year}</div>
                </div>
            \`).join('');
        }

        function openModal(id) {
            const article = data.articles.find(a => a.id === id);
            if (!article) return;

            document.getElementById('modal-header-content').innerHTML = \`
                <div class="flex gap-2 mb-3 flex-wrap">
                    <div class="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider \${article.alignment.includes('Support') ? 'bg-emerald-100 text-emerald-700' : article.alignment.includes('Contradict') ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}">\${article.alignment}</div>
                    \${article.tags.map(t => \`<div class="text-xs font-mono bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">\${t}</div>\`).join('')}
                </div>
                <h2 class="text-2xl font-bold text-slate-900 leading-tight mb-2">\${article.realTitle}</h2>
                <div class="text-slate-500 text-sm flex gap-4"><span class="font-bold">\${article.year}</span><span>\${article.authors}</span></div>
            \`;

            document.getElementById('modal-body').innerHTML = \`
                <div class="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-700 text-lg mb-8">\${article.fullAbstract || article.abstract}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm prose prose-sm">\${(article.mainPoints || '').replace(/\\n/g, '<br>')}</div>
                    <div class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm prose prose-sm">\${(article.conclusions || '').replace(/\\n/g, '<br>')}</div>
                </div>
                <div class="space-y-4">
                    <h3 class="font-bold text-slate-800 uppercase text-sm">Key Citations</h3>
                    \${article.quotes.map(q => \`<div class="bg-indigo-50 p-5 rounded-lg border-l-4 border-indigo-400"><p class="italic text-indigo-900">"\${q}"</p></div>\`).join('')}
                </div>
            \`;

            document.getElementById('modal-overlay').classList.replace('hidden', 'flex');
        }

        function closeModal() { document.getElementById('modal-overlay').classList.replace('flex', 'hidden'); }

        // Close on overlay click
        document.getElementById('modal-overlay').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        renderFilters();
        renderGrid();
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research_static_dashboard_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.articles) {
          setArticles(data.articles || []);
          setUserGuide(data.userGuide || "");
          setChatMessages(data.chatMessages || []);
          setCompReport(data.compReport || null);
          setSynthReport(data.synthReport || null);
          setTaxonomy(data.taxonomy || []);
          setTaxonomyMode(data.taxonomyMode || 'standard');
          setAppState('ready');
        } else { alert("Invalid project file format."); }
      } catch (err) { alert("Failed to load project file."); }
    };
    reader.readAsText(file);
  };

  const uniqueTags = useMemo(() => {
    return [...new Set(articles.flatMap(a => a.tags))].sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      // Check if the article's tags array includes the filter tag
      const matchesTag = filterTag ? article.tags.includes(filterTag) : true;
      const matchesAlignment = filterAlignment ? article.alignment.toLowerCase().includes(filterAlignment.toLowerCase()) : true;
      return matchesTag && matchesAlignment;
    });
  }, [articles, filterTag, filterAlignment]);

  if (appState === 'setup') {
    return (
      <div className="min-h-screen w-full bg-slate-50 p-8 overflow-y-auto flex justify-center">
        <div className="max-w-3xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-slate-900">Thesis Research Assistant</h1>
            <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-300 shadow-sm cursor-pointer hover:bg-slate-50">
               <FolderOpen size={16} className="text-slate-600"/>
               <span className="text-sm font-bold text-slate-600">Load Previous Workspace</span>
               <input type="file" accept=".json" className="hidden" onChange={handleLoadProject} />
            </label>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-2">1. Thesis Abstract / Goal</label>
             <textarea className="w-full h-32 p-3 border rounded-lg" value={userGuide} onChange={(e) => setUserGuide(e.target.value)} placeholder="Paste your thesis here..." />
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-4">2. Taxonomy Size & Specificity</label>
             <div className="grid grid-cols-3 gap-4">
                <button onClick={() => setTaxonomyMode('broad')} className={`p-4 border rounded-xl text-left transition-all ${taxonomyMode === 'broad' ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'hover:bg-slate-50'}`}><div className="font-bold text-slate-900 mb-1">Broad</div><div className="text-xs text-slate-500">3-5 High-level disciplines</div></button>
                <button onClick={() => setTaxonomyMode('standard')} className={`p-4 border rounded-xl text-left transition-all ${taxonomyMode === 'standard' ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'hover:bg-slate-50'}`}><div className="font-bold text-slate-900 mb-1">Standard</div><div className="text-xs text-slate-500">5-10 Common themes</div></button>
                <button onClick={() => setTaxonomyMode('specific')} className={`p-4 border rounded-xl text-left transition-all ${taxonomyMode === 'specific' ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'hover:bg-slate-50'}`}><div className="font-bold text-slate-900 mb-1">Specific</div><div className="text-xs text-slate-500">10-20 Niche topics</div></button>
             </div>
          </div>

          {/* Developer Export Options */}
          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <button 
              onClick={() => setShowDevExport(!showDevExport)}
              className="flex items-center gap-2 font-bold text-slate-700 hover:text-indigo-600 mb-2"
            >
              <Code size={18} /> Developer Export Options
              {showDevExport ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {showDevExport && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600 mb-4">Download the individual files needed to deploy this app yourself (e.g., to Vercel or Netlify).</p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleDownloadSource('package')} className="flex items-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                    <Package size={16} className="text-indigo-600" /> package.json
                  </button>
                  <button onClick={() => handleDownloadSource('html')} className="flex items-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                    <FileCode size={16} className="text-orange-600" /> index.html
                  </button>
                  <button onClick={() => handleDownloadSource('vite')} className="flex items-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                    <Settings size={16} className="text-yellow-600" /> vite.config.js
                  </button>
                  <button onClick={() => handleDownloadSource('css')} className="flex items-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                    <FileCode size={16} className="text-sky-600" /> src/index.css
                  </button>
                  <button onClick={() => handleDownloadSource('main')} className="flex items-center gap-2 p-3 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                    <FileCode size={16} className="text-blue-600" /> src/index.jsx
                  </button>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mt-4">
                  <strong>Note for src/App.jsx:</strong> The code for <code>App.jsx</code> is the file you are currently viewing. Please copy the content of this file manually and save it as <code>src/App.jsx</code>.
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center relative">
            <Upload size={40} className="text-slate-400 mb-2" />
            <p className="text-slate-500 mb-4">{files.length > 0 ? `${files.length} files selected` : "Drag .md/.txt files here"}</p>
            <input type="file" multiple accept=".md,.txt" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} />
          </div>
          <button onClick={startProcessing} disabled={files.length === 0} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg">Start Deep Analysis</button>
        </div>
      </div>
    );
  }

  if (appState === 'processing') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-slate-800">{progress.status}</h2>
        <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} /></div>
        <p className="text-slate-500 mt-2 text-sm">Processing {progress.current}/{progress.total}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Navigation activeTab={activeTab} setTab={setActiveTab} onSave={handleSaveProject} onExportStatic={handleExportStaticSite} />
      
      {activeTab === 'dashboard' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 p-6 shadow-sm z-10 flex flex-col gap-4">
            <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold text-slate-800">Library Dashboard</h1><div className="text-sm text-slate-500">Showing {filteredArticles.length} of {articles.length} papers</div></div></div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Topic Categories (Taxonomy)</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterTag(null)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filterTag ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All Topics</button>
                {taxonomy.map(tag => (<button key={tag} onClick={() => setFilterTag(tag)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tag}</button>))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
              <Filter size={16} /><span className="font-bold mr-2">Thesis Alignment:</span>
              <button onClick={() => setFilterAlignment(null)} className={`px-3 py-1 rounded-md border ${!filterAlignment ? 'bg-slate-200 border-slate-300 font-bold' : 'border-transparent hover:bg-slate-100'}`}>All</button>
              <button onClick={() => setFilterAlignment('Support')} className={`px-3 py-1 rounded-md border flex items-center gap-1 ${filterAlignment === 'Support' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'border-transparent hover:bg-slate-100'}`}><CheckCircle size={14} /> Supports</button>
              <button onClick={() => setFilterAlignment('Contradict')} className={`px-3 py-1 rounded-md border flex items-center gap-1 ${filterAlignment === 'Contradict' ? 'bg-rose-100 border-rose-300 text-rose-800 font-bold' : 'border-transparent hover:bg-slate-100'}`}><XCircle size={14} /> Contradicts</button>
              <button onClick={() => setFilterAlignment('Neutral')} className={`px-3 py-1 rounded-md border flex items-center gap-1 ${filterAlignment === 'Neutral' ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold' : 'border-transparent hover:bg-slate-100'}`}><div className="w-3 h-3 bg-slate-400 rounded-full"></div> Neutral</button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArticles.map(article => (
                <div key={article.id} onClick={() => setSelectedArticle(article)} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition-all group animate-in fade-in zoom-in-95 duration-300">
                   <div className="flex justify-between items-start mb-2 gap-2">
                     <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase inline-block whitespace-nowrap ${article.alignment.includes('Support') ? 'bg-emerald-100 text-emerald-700' : article.alignment.includes('Contradict') ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{article.alignment.split(' ')[0]}</div>
                     <div className="flex-1 flex gap-1 overflow-hidden justify-end">
                       {article.tags.slice(0, 2).map(t => (<span key={t} className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 truncate">{t}</span>))}
                       {article.tags.length > 2 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">+{article.tags.length - 2}</span>}
                     </div>
                   </div>
                   <h3 className="font-bold text-sm text-slate-800 mb-2 line-clamp-2">{article.realTitle}</h3>
                   <div className="text-xs text-slate-400">{article.year}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tag-manager' && <TagManagerView taxonomy={taxonomy} setTaxonomy={setTaxonomy} articles={articles} setArticles={setArticles} onNavigateToTag={handleNavigateToTag} />}
      {activeTab === 'topics' && <TopicExplorerView articles={articles} setSelectedArticle={setSelectedArticle} />}
      {activeTab === 'analysis' && <ComparativeAnalysisView articles={articles} userGuide={userGuide} report={compReport} setReport={setCompReport} />}
      {activeTab === 'synthesis' && <SynthesisView articles={articles} report={synthReport} setReport={setSynthReport} />}
      {activeTab === 'chat' && <ChatView articles={articles} messages={chatMessages} setMessages={setChatMessages} />}
      {activeTab === 'bibliography' && <BibliographyView articles={articles} />}

      <ArticleDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} onUpdate={handleUpdateArticle} taxonomy={taxonomy} setTaxonomy={setTaxonomy} />
    </div>
  );
}
