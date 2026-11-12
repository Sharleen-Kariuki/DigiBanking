import { ApiClient } from '../services/api-client';
import { ChunkedUploader, UploaderStatus, UploadProgressInfo } from '../services/chunked-uploader';
import { Modal } from '../components/modal';
import { ToastManager } from '../components/toast';

export class NewBatchModal {
  private static uploader: ChunkedUploader | null = null;

  public static open(initialBatchName = ''): void {
    const container = document.createElement('div');

    container.innerHTML = `
      <div id="step-form">
        <p style="font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 1.25rem;">
          Submit a spreadsheet of members requesting digital banking access. The system validates each row before any member is onboarded.
        </p>

        <div style="background-color: var(--primary-light); border: 1px solid var(--primary-border); border-radius: var(--radius-md); padding: 0.875rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
          <div>
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">Need the spreadsheet template?</div>
            <div style="font-size: 0.75rem; color: var(--neutral-600);">Download the official bank onboarding template or load the Riverside Branch walkthrough workbook.</div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" id="btn-download-template">
               Blank Template
            </button>
            <button type="button" class="btn btn-sm btn-outline-primary" id="btn-load-demo-file">
              Load Riverside Demo File
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="batch-name">
            Batch Name <span class="required">*</span>
          </label>
          <input
            type="text"
            id="batch-name"
            class="form-control"
            maxlength="120"
            required
            placeholder="e.g. Riverside Branch — October Enrolment"
            value="${initialBatchName}"
          />
          <div class="form-hint">Required display name for this upload session (up to 120 characters).</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="batch-desc">
            Description <span style="font-weight: normal; color: var(--neutral-500);">(Optional)</span>
          </label>
          <textarea
            id="batch-desc"
            class="form-control"
            rows="2"
            maxlength="1000"
            placeholder="e.g. October digital banking enrollments from Riverside branch members."
          ></textarea>
          <div class="form-hint">Optional batch notes for audit and staff tracking.</div>
        </div>

        <div class="form-group">
          <label class="form-label">
            Completed Spreadsheet (XLSX) <span class="required">*</span>
          </label>
          <div class="file-dropzone" id="file-dropzone" tabindex="0" role="button" aria-label="Drop Excel spreadsheet here or click to browse">
            <div class="dropzone-text" id="dropzone-text">Click to choose file or drag & drop</div>
            <div class="dropzone-subtext" id="dropzone-subtext">Supports Microsoft Excel (.xlsx) workbooks up to 50MB</div>
            <input type="file" id="file-input" accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display: none;" />
          </div>
        </div>

        <div id="file-details-card" style="display: none; background: #ffffff; border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div>
                <div id="selected-file-name" style="font-weight: 600; font-size: 0.9rem; color: var(--neutral-900);"></div>
                <div id="selected-file-size" style="font-size: 0.75rem; color: var(--neutral-500);"></div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-clear-file">Change</button>
          </div>
        </div>

        <div class="form-group" style="margin-top: 0.5rem;">
          <label style="display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; font-size: 0.85rem; color: var(--neutral-800); background: var(--neutral-50); border: 1px dashed var(--neutral-300); border-radius: var(--radius-md); padding: 0.75rem 0.85rem;">
            <input type="checkbox" id="chk-simulate-interruption" style="margin-top: 0.15rem;" />
            <div>
              <strong style="color: var(--primary);">Simulate network interruption during upload</strong>
              <div style="font-size: 0.75rem; color: var(--neutral-500); margin-top: 0.15rem;">
                Step 3 demonstration: Pauses after uploading the first chunk so you can inspect retained state and click "Resume Upload".
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- Live Upload Monitor (Shown during upload) -->
      <div id="step-upload" style="display: none;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem;" id="upload-status-title">Uploading Workbook...</h3>
          <p style="font-size: 0.85rem; color: var(--neutral-500);" id="upload-status-desc">Transferring binary chunks securely to server</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span id="upload-progress-percent">0%</span>
            <span id="upload-chunk-info" style="color: var(--neutral-500); font-variant-numeric: tabular-nums;">Chunk 0 of 0</span>
          </div>
          <div class="progress-container" style="height: 10px;">
            <div class="progress-bar-fill animated" id="upload-progress-bar" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Walkthrough Interruption Simulation Box -->
        <div id="interruption-banner" style="display: none; background-color: var(--warning-bg); border: 1px solid var(--warning-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; gap: 0.75rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--warning-text);">Network Connection Interrupted</div>
              <p style="font-size: 0.8rem; color: var(--warning-text); margin-top: 0.25rem;">
                Upload paused. The server has securely retained uploaded chunks. Click <strong>Resume Upload</strong> to continue seamlessly without re-uploading previously accepted chunks.
              </p>
              <div style="margin-top: 0.75rem;">
                <button type="button" class="btn btn-sm btn-primary" id="btn-resume-upload">
                  Resume Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 1.5rem;" id="simulate-btn-wrap">
          <button type="button" class="btn btn-warning btn-sm" id="btn-simulate-interruption">
            <i class="fa-solid fa-bolt" aria-hidden="true"></i> Simulate Network Interruption
          </button>
        </div>
      </div>
    `;

    let selectedFile: File | null = null;

    const stepForm = container.querySelector<HTMLElement>('#step-form')!;
    const stepUpload = container.querySelector<HTMLElement>('#step-upload')!;
    const batchNameInput = container.querySelector<HTMLInputElement>('#batch-name')!;
    const batchDescInput = container.querySelector<HTMLTextAreaElement>('#batch-desc')!;
    const dropzone = container.querySelector<HTMLElement>('#file-dropzone')!;
    const fileInput = container.querySelector<HTMLInputElement>('#file-input')!;
    const fileCard = container.querySelector<HTMLElement>('#file-details-card')!;
    const fileNameEl = container.querySelector<HTMLElement>('#selected-file-name')!;
    const fileSizeEl = container.querySelector<HTMLElement>('#selected-file-size')!;
    const clearFileBtn = container.querySelector<HTMLElement>('#btn-clear-file')!;
    const chkSimulateInterruption = container.querySelector<HTMLInputElement>('#chk-simulate-interruption')!;

    const uploadStatusTitle = container.querySelector<HTMLElement>('#upload-status-title')!;
    const uploadStatusDesc = container.querySelector<HTMLElement>('#upload-status-desc')!;
    const uploadProgressBar = container.querySelector<HTMLElement>('#upload-progress-bar')!;
    const uploadProgressPercent = container.querySelector<HTMLElement>('#upload-progress-percent')!;
    const uploadChunkInfo = container.querySelector<HTMLElement>('#upload-chunk-info')!;
    const interruptionBanner = container.querySelector<HTMLElement>('#interruption-banner')!;
    const btnSimulateInterruption = container.querySelector<HTMLButtonElement>('#btn-simulate-interruption')!;
    const btnResumeUpload = container.querySelector<HTMLButtonElement>('#btn-resume-upload')!;

    // Download blank template
    container.querySelector('#btn-download-template')?.addEventListener('click', async () => {
      try {
        await ApiClient.downloadTemplate();
        ToastManager.success('Onboarding template downloaded.');
      } catch (err) {
        ToastManager.error(`Failed to download template: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    // Load Riverside demo file directly
    container.querySelector('#btn-load-demo-file')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/riverside-branch-october-enrolment.xlsx');
        if (!res.ok) throw new Error('Demo file not found');
        const blob = await res.blob();
        selectedFile = new File([blob], 'riverside-branch-october-enrolment.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        batchNameInput.value = 'Riverside Branch — October Enrolment';
        displayFile(selectedFile);
        ToastManager.info('Loaded Riverside Branch demo workbook with 7 test rows.');
      } catch (err) {
        ToastManager.error(`Failed to load demo file: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    function displayFile(file: File): void {
      selectedFile = file;
      fileNameEl.textContent = file.name;
      const sizeKb = (file.size / 1024).toFixed(1);
      fileSizeEl.textContent = `${sizeKb} KB (${file.size.toLocaleString()} bytes)`;
      dropzone.style.display = 'none';
      fileCard.style.display = 'block';
    }

    clearFileBtn.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      fileCard.style.display = 'none';
      dropzone.style.display = 'block';
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        displayFile(fileInput.files[0]);
      }
    });

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        displayFile(e.dataTransfer.files[0]);
      }
    });

    const modal = new Modal({
      title: 'Create New Upload Batch',
      content: container,
      maxWidth: '650px',
      footerButtons: [
        {
          label: 'Cancel',
          className: 'btn-secondary',
          onClick: m => {
            if (this.uploader) {
              this.uploader.pause();
              this.uploader = null;
            }
            m.close();
          }
        },
        {
          label: 'Start Upload',
          className: 'btn-primary btn-submit-upload',
          onClick: async () => {
            const batchName = batchNameInput.value.trim();
            const description = batchDescInput.value.trim();

            if (!batchName) {
              ToastManager.error('Batch name is required.');
              batchNameInput.focus();
              return;
            }

            if (!selectedFile) {
              ToastManager.error('Please choose or drop an Excel (.xlsx) workbook.');
              return;
            }

            const simulateInterruption = chkSimulateInterruption?.checked || false;

            // Switch to upload view
            stepForm.style.display = 'none';
            stepUpload.style.display = 'block';

            // Show simulate button
            btnSimulateInterruption.style.display = 'inline-flex';

            // Hide footer submit button
            const submitBtn = container.closest('.modal-dialog')?.querySelector<HTMLButtonElement>('.btn-submit-upload');
            if (submitBtn) submitBtn.style.display = 'none';

            this.uploader = new ChunkedUploader({
              batchName,
              description,
              file: selectedFile,
              simulateInterruption,
              onStatusChange: (status: UploaderStatus, message?: string) => {
                if (status === 'interrupted') {
                  uploadStatusTitle.textContent = 'Upload Interrupted';
                  uploadStatusDesc.textContent = message || 'Network connection dropped.';
                  uploadProgressBar.classList.remove('animated');
                  uploadProgressBar.classList.add('warning');
                  interruptionBanner.style.display = 'block';
                  btnSimulateInterruption.style.display = 'none';
                  btnResumeUpload.disabled = false;
                  btnResumeUpload.textContent = 'Resume Upload';
                } else if (status === 'uploading' || status === 'initiating' || status === 'hashing') {
                  uploadStatusTitle.textContent = status === 'uploading' ? 'Uploading Chunks...' : 'Preparing Upload...';
                  uploadStatusDesc.textContent = message || 'Transferring file chunks to server';
                  uploadProgressBar.classList.add('animated');
                  uploadProgressBar.classList.remove('warning');
                  interruptionBanner.style.display = 'none';
                  btnSimulateInterruption.style.display = 'inline-flex';
                } else if (status === 'completing') {
                  uploadStatusTitle.textContent = 'Verifying File Assembly...';
                  uploadStatusDesc.textContent = 'Server is validating file SHA-256 and initiating validation';
                  interruptionBanner.style.display = 'none';
                  btnSimulateInterruption.style.display = 'none';
                } else if (status === 'completed') {
                  uploadStatusTitle.textContent = 'Upload Complete!';
                  uploadStatusDesc.textContent = 'Starting validation stream...';
                  interruptionBanner.style.display = 'none';
                  btnSimulateInterruption.style.display = 'none';
                }
              },
              onProgress: (p: UploadProgressInfo) => {
                uploadProgressBar.style.width = `${p.percent}%`;
                uploadProgressPercent.textContent = `${p.percent}%`;
                uploadChunkInfo.textContent = `Chunk ${p.currentChunk} of ${p.totalChunks}`;
              },
              onComplete: session => {
                ToastManager.success(`Batch "${session.batch_name}" uploaded. Asynchronous validation has started.`);
                modal.close();
                window.location.hash = `#/batch/${session.id}`;
              },
              onError: err => {
                ToastManager.error(`Upload error: ${err.message}`);
              }
            });

            try {
              await this.uploader.start();
            } catch (err) {
              console.log('Upload stopped or failed:', err);
            }
          }
        }
      ]
    });

    btnSimulateInterruption.addEventListener('click', () => {
      if (this.uploader) {
        this.uploader.simulateNetworkInterruption();
        ToastManager.warning('Simulated network interruption: Upload paused.');
      }
    });

    btnResumeUpload.addEventListener('click', async () => {
      if (this.uploader) {
        btnResumeUpload.disabled = true;
        btnResumeUpload.textContent = 'Reconnecting...';
        ToastManager.info('Reconnecting and resuming batch upload...');
        try {
          await this.uploader.resume();
        } catch (err) {
          console.log('Resume error:', err);
          btnResumeUpload.disabled = false;
          btnResumeUpload.textContent = 'Resume Upload';
        }
      }
    });

    modal.open();
  }
}
