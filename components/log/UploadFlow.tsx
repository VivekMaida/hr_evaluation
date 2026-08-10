'use client';

import { useState } from 'react';
import { UploadStepper, type UploadStep } from './UploadStepper';
import { UploadStepDone } from './UploadStepDone';
import { UploadStepDownload } from './UploadStepDownload';
import { UploadStepValidate } from './UploadStepValidate';

export function UploadFlow() {
  const [step, setStep] = useState<UploadStep>('validate');

  return (
    <div
      style={{
        padding: '22px 36px 34px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <UploadStepper step={step} onChange={setStep} />

      {step === 'download' ? <UploadStepDownload /> : null}
      {step === 'validate' ? (
        <UploadStepValidate onCommit={() => setStep('done')} />
      ) : null}
      {step === 'done' ? (
        <UploadStepDone onRestart={() => setStep('download')} />
      ) : null}
    </div>
  );
}
