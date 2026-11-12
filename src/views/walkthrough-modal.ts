import { Modal } from '../components/modal';
import { NewBatchModal } from './new-batch-modal';

export class WalkthroughModal {
  public static open(): void {
    const content = document.createElement('div');
    content.innerHTML = `
      <p style="font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 1.25rem;">
        This interactive checklist guides you through all 9 demonstration steps specified in <code>assignment.md</code>.
      </p>

      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <!-- Step 1 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.9rem; color: var(--primary);">Step 1: Open New Batch & Download Template</strong>
            <button type="button" class="btn btn-sm btn-primary" id="wt-step-1-btn">Open New Batch Modal</button>
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Pre-fills “Riverside Branch — October Enrolment”. Click “Blank Template” to download <code>onboarding-template.xlsx</code> directly from the API.
          </p>
        </div>

        <!-- Step 2 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 2: Load or Upload Completed Workbook</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Click <strong>“Load Riverside Demo File”</strong> inside the New Batch modal. The pre-generated workbook contains 7 test rows (3 valid core members, 1 intra-batch duplicate, and 3 invalid records).
          </p>
        </div>

        <!-- Step 3 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 3: Simulate Network Interruption & Resume Upload</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            While chunks are uploading, click <strong>“Simulate Network Interruption”</strong>. The upload pauses and displays retained chunks. Click <strong>“Resume Upload”</strong> to continue without re-uploading existing chunks.
          </p>
        </div>

        <!-- Step 4 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 4: Real-Time SSE Validation Monitoring</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Upon file assembly, the server begins row validation. Watch the live progress bar and expand the <strong>Server-Sent Events Stream</strong> log to observe live event messages.
          </p>
        </div>

        <!-- Step 5 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 5: Review Results Before Taking Action</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Notice that <strong>no members have been onboarded yet</strong> (Onboarded = 0). Review the records table and use the status tabs (Valid, Invalid, Duplicate) to inspect specific reasons.
          </p>
        </div>

        <!-- Step 6 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 6: Confirm Review & Commit Valid Rows</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Check the explicit confirmation checkbox: <em>“I confirm that I have reviewed the validation results...”</em> and click <strong>“Commit Valid Rows”</strong> to send the XML commit request.
          </p>
        </div>

        <!-- Step 7 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 7: Confirm Committed Members & Download Invalid Rows</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            The confirmation shows 3 onboarded members. Click <strong>“Download Invalid Rows (.xlsx)”</strong> to fetch <code>invalid.xlsx</code> directly from the API.
          </p>
        </div>

        <!-- Step 8 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 8: Filter & Export Records</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Return to the batches list or batch records table, filter by status, and click <strong>“Export CSV”</strong> or <strong>“Export XLSX”</strong> to download audit exports.
          </p>
        </div>

        <!-- Step 9 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.9rem; color: var(--primary);">Step 9: Open Onboarded Members Directory</strong>
            <a href="#/members" class="btn btn-sm btn-secondary" id="wt-step-9-link">Go to Members →</a>
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Search for <code>Amina</code> or <code>MBR-100001</code> and click <strong>“View”</strong> to see their full profile and link to the source batch.
          </p>
        </div>
      </div>
    `;

    const modal = new Modal({
      title: 'Walkthrough Demonstration Checklist',
      content,
      maxWidth: '680px',
      footerButtons: [
        {
          label: 'Close',
          className: 'btn-secondary',
          onClick: m => m.close()
        }
      ]
    });

    content.querySelector('#wt-step-1-btn')?.addEventListener('click', () => {
      modal.close();
      NewBatchModal.open();
    });

    content.querySelector('#wt-step-9-link')?.addEventListener('click', () => {
      modal.close();
    });

    modal.open();
  }
}

