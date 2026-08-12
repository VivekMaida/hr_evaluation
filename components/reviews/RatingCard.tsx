'use client';

import { useState } from 'react';
import { SectionLabel } from '@/components/ui';
import {
  BANDS,
  JUSTIFICATION_MIN_CHARS,
  impliedBand,
  type Band,
} from '@/lib/reviews';

function BandButton({
  band,
  selected,
  implied,
  onSelect,
}: {
  band: Band;
  selected: boolean;
  implied: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        width: '100%',
        fontFamily: 'inherit',
        textAlign: 'left',
        background: selected ? 'var(--tint-green)' : 'var(--white)',
        // The dashed outline marks the score-implied band, so the distance the
        // lead has travelled from the record stays visible while they choose.
        border: selected
          ? '2px solid var(--green)'
          : implied
            ? '1px dashed var(--navy)'
            : '1px solid var(--grey-line)',
        borderRadius: 'var(--radius)',
        padding: selected ? 14 : 15,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <span
        className="step-num"
        style={{
          width: 30,
          height: 30,
          fontSize: 15,
          background: selected ? 'var(--green)' : 'var(--grey-surface)',
          color: selected ? 'var(--white)' : 'var(--navy)',
        }}
      >
        {band.value}
      </span>
      <span
        style={{
          fontSize: 14,
          lineHeight: 1.3,
          fontWeight: selected ? 700 : 400,
          color: selected ? 'var(--navy)' : 'var(--grey-body)',
        }}
      >
        {band.label}
      </span>
    </button>
  );
}

export function RatingCard({ yearAverage }: { yearAverage: number }) {
  const implied = impliedBand(yearAverage);
  const [chosen, setChosen] = useState<Band>(implied);
  const [justification, setJustification] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const distance = chosen.value - implied.value;
  const steps = Math.abs(distance);
  const needsJustification = steps >= 2;
  const justificationOk =
    justification.trim().length >= JUSTIFICATION_MIN_CHARS;
  const blocked = needsJustification && !justificationOk;

  return (
    <div
      className="card"
      style={{ padding: '22px 26px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div className="spread" style={{ alignItems: 'baseline', gap: 24 }}>
        <SectionLabel>Annual rating</SectionLabel>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--grey-body)' }}>
            Score-implied band
          </span>
          <span
            className="num"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--navy)',
              background: 'var(--grey-surface)',
              borderRadius: 'var(--radius)',
              padding: '5px 12px',
            }}
          >
            {implied.value} — {implied.label}
          </span>
          <span className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
            {yearAverage.toFixed(1)} falls in {implied.range}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {BANDS.map((band) => (
          <div key={band.value} style={{ flex: 1 }}>
            <BandButton
              band={band}
              selected={band.value === chosen.value}
              implied={band.value === implied.value}
              onSelect={() => setChosen(band)}
            />
          </div>
        ))}
      </div>

      {steps === 0 ? (
        <div
          className="callout callout--positive"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 14 }}
        >
          <span>
            <strong style={{ color: 'var(--green)' }}>Matches the record.</strong> The
            rating sits in the band the twelve months imply.
          </span>
        </div>
      ) : null}

      {steps === 1 ? (
        <div
          className="callout callout--info"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 14 }}
        >
          <span>
            <strong style={{ color: 'var(--blue)' }}>One band from the record.</strong>{' '}
            Allowed without justification — HR sees the gap in Calibration.
          </span>
        </div>
      ) : null}

      {needsJustification ? (
        <div
          className="callout callout--alert"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 14 }}
        >
          <span>
            <strong style={{ color: 'var(--red)' }}>
              {steps} bands {distance < 0 ? 'below' : 'above'} the score-implied band.
            </strong>{' '}
            A written justification is required before this can be submitted.
          </span>
        </div>
      ) : null}

      {needsJustification ? (
        <div
          className="stack"
          style={{
            gap: 8,
            background: 'var(--white)',
            border: '1px solid var(--red)',
            borderRadius: 'var(--radius)',
            padding: '16px 18px 18px',
          }}
        >
          <div className="spread" style={{ alignItems: 'baseline' }}>
            <label
              htmlFor="justification"
              style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--red)' }}
            >
              Justification for departing from the record
            </label>
            <span style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
              Visible to HR and to the employee · minimum {JUSTIFICATION_MIN_CHARS}{' '}
              characters
            </span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
            Point to something the twelve months do not capture — conduct, a role change
            mid-year, a target that was set wrong. Do not restate the score.
          </div>
          <textarea
            id="justification"
            className="field"
            rows={3}
            placeholder="Required — explain what the record does not show"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            style={{
              width: '100%',
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--grey-body)',
              borderColor: 'var(--red)',
              padding: '10px 12px',
              resize: 'vertical',
            }}
          />
        </div>
      ) : null}

      <div className="stack" style={{ gap: 8 }}>
        <label
          htmlFor="comment"
          style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy)' }}
        >
          Reviewer comment{' '}
          <span style={{ fontWeight: 400, color: 'var(--grey-body)' }}>
            — optional, carried into the appraisal letter
          </span>
        </label>
        <textarea
          id="comment"
          className="field"
          rows={2}
          placeholder="Optional"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{
            width: '100%',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--grey-body)',
            padding: '10px 12px',
            resize: 'vertical',
          }}
        />
      </div>

      <div
        className="spread"
        style={{ gap: 24, borderTop: '1px solid var(--grey-surface)', paddingTop: 18 }}
      >
        <div className="stack" style={{ gap: 3 }}>
          <div style={{ fontSize: 13, color: 'var(--grey-body)' }}>
            {submitted ? 'Submitted' : 'Submitting'}
          </div>
          <div
            className="num"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}
          >
            {chosen.value} — {chosen.label}
          </div>
        </div>
        <div className="row" style={{ gap: 14 }}>
          {blocked ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
              Justification required before submitting
            </span>
          ) : null}
          <button type="button" className="btn btn--secondary" style={{ fontSize: 14.5 }}>
            Save draft
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ fontSize: 14.5, padding: '11px 24px' }}
            disabled={blocked || submitted}
            onClick={() => setSubmitted(true)}
          >
            Submit rating
          </button>
        </div>
      </div>
    </div>
  );
}
