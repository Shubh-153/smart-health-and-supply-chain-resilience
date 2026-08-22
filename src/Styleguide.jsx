import React from 'react';
import TriageTag from './components/TriageTag';

const Styleguide = () => {
  return (
    <div className="p-12 max-w-7xl mx-auto space-y-16">
      <div>
        <h1 className="text-5xl font-display font-bold text-ink mb-2">Styleguide</h1>
        <p className="text-ink-soft font-body text-lg">
          Reference for Aarogya Grid token system and core components.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-display font-bold text-ink mb-6 pb-2 border-b border-rule">
          TriageTag Component
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TriageTag 
            phc={{ risk_bucket: 'Low', risk_score: 12, id: 'PHC-7281', name: 'Munnar Central', district: 'Idukki', state: 'Kerala' }}
          />
          <TriageTag 
            phc={{ risk_bucket: 'Medium', risk_score: 34, id: 'PHC-9920', name: 'Idukki East', district: 'Idukki', state: 'Kerala' }}
          />
          <TriageTag 
            phc={{ risk_bucket: 'High', risk_score: 78, id: 'PHC-4412', name: 'Kottayam North', district: 'Kottayam', state: 'Kerala' }}
          />
          <TriageTag 
            phc={{ risk_bucket: 'Critical', risk_score: 95, id: 'PHC-1105', name: 'Ernakulam Gen', district: 'Ernakulam', state: 'Kerala' }}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display font-bold text-ink mb-6 pb-2 border-b border-rule">
          Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch name="bg-paper" className="bg-paper border border-rule" />
          <ColorSwatch name="bg-card" className="bg-card border border-rule" />
          <ColorSwatch name="bg-rule" className="bg-rule" />
          <ColorSwatch name="bg-signal" className="bg-signal text-paper" />
          <ColorSwatch name="text-ink" className="bg-paper border border-rule text-ink" textColor="text-ink" />
          <ColorSwatch name="text-ink-soft" className="bg-paper border border-rule text-ink-soft" textColor="text-ink-soft" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display font-bold text-ink mb-6 pb-2 border-b border-rule">
          Triage Bands
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch name="Minimal" token="bg-triage-min" className="bg-triage-min text-paper" />
          <ColorSwatch name="Delayed" token="bg-triage-del" className="bg-triage-del text-ink" />
          <ColorSwatch name="Urgent" token="bg-triage-urg" className="bg-triage-urg text-paper" />
          <ColorSwatch name="Immediate" token="bg-triage-imm" className="bg-triage-imm text-paper" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display font-bold text-ink mb-6 pb-2 border-b border-rule">
          Typography
        </h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-ink mb-4 font-display">Display (Bricolage Grotesque)</h3>
            <div className="space-y-4">
              <TypeSample name="text-5xl" size="text-5xl" font="font-display" weight="font-bold" use="Main Page Titles" />
              <TypeSample name="text-4xl" size="text-4xl" font="font-display" weight="font-bold" use="Section Headers" />
              <TypeSample name="text-3xl" size="text-3xl" font="font-display" weight="font-bold" use="Card Titles" />
              <TypeSample name="text-2xl" size="text-2xl" font="font-display" weight="font-semibold" use="Sub-headers" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-ink mb-4 font-display">Body (Public Sans)</h3>
            <div className="space-y-4">
              <TypeSample name="text-lg" size="text-lg" font="font-body" weight="font-normal" use="Intro Text" />
              <TypeSample name="text-base" size="text-base" font="font-body" weight="font-normal" use="Standard Body Copy" />
              <TypeSample name="text-sm" size="text-sm" font="font-body" weight="font-normal" use="Secondary Text, Labels" />
              <TypeSample name="text-xs" size="text-xs" font="font-body" weight="font-medium" use="Metadata, Tiny Labels" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-ink mb-4 font-display">Mono (IBM Plex Mono)</h3>
            <div className="space-y-4">
              <TypeSample name="text-base" size="text-base" font="font-mono" weight="font-normal" use="IDs, Codes" />
              <TypeSample name="text-sm" size="text-sm" font="font-mono" weight="font-medium" use="Data Tables, Stats" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const ColorSwatch = ({ name, token, className, textColor }) => (
  <div className={`p-4 rounded-lg flex flex-col justify-end h-24 ${className}`}>
    <span className={`font-mono text-sm font-medium ${textColor || ''}`}>{name}</span>
    {token && <span className={`font-mono text-xs opacity-75 ${textColor || ''}`}>{token}</span>}
  </div>
);

const TypeSample = ({ name, size, font, weight, use }) => (
  <div className="flex items-baseline gap-4 py-2 border-b border-rule border-dashed last:border-0">
    <div className="w-32 flex-shrink-0">
      <span className="font-mono text-sm text-ink-soft">{name}</span>
      <div className="text-xs text-ink-soft opacity-75">{use}</div>
    </div>
    <div className={`${size} ${font} ${weight} text-ink truncate`}>
      The quick brown fox jumps over the lazy dog.
    </div>
  </div>
);

export default Styleguide;
