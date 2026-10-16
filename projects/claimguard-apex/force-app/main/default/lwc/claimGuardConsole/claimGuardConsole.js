import { LightningElement, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import listClaims from '@salesforce/apex/ClaimGuardController.listClaims';
import getSummary from '@salesforce/apex/ClaimGuardController.getSummary';
import getAudit from '@salesforce/apex/ClaimGuardController.getAudit';
import transitionClaim from '@salesforce/apex/ClaimGuardController.transitionClaim';

const COLUMNS = [
    { label: 'Claim', fieldName: 'recordUrl', type: 'url', typeAttributes: { label: { fieldName: 'Name' } } },
    { label: 'Transaction', fieldName: 'Transaction_Ref__c' },
    { label: 'Amount', fieldName: 'Amount__c', type: 'currency', typeAttributes: { currencyCode: { fieldName: 'Currency_Code__c' } } },
    { label: 'Priority', fieldName: 'Priority__c' },
    { label: 'Status', fieldName: 'Status__c' },
    { label: 'SLA deadline', fieldName: 'Due_At__c', type: 'date', typeAttributes: { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' } },
    { label: 'Escalated', fieldName: 'Escalated__c', type: 'boolean' },
    { type: 'button', typeAttributes: { label: 'Review', name: 'review', variant: 'base' } }
];

export default class ClaimGuardConsole extends LightningElement {
    columns = COLUMNS;
    rows = [];
    summary = { open: 0, critical: 0, overdue: 0, escalated: 0 };
    statusFilter = 'All';
    searchTerm = '';
    selected;
    audit = [];
    resolution = '';
    showCreate = false;
    busy = false;
    errorMessage;
    claimsWire;
    summaryWire;
    searchTimer;
    auditLoading = false;

    @wire(getObjectInfo, { objectApiName: 'Bank_Claim__c' })
    claimObjectInfo;

    @wire(listClaims, { statusFilter: '$statusFilter', searchTerm: '$searchTerm' })
    wiredClaims(value) {
        this.claimsWire = value;
        if (value.data) {
            this.rows = value.data.map((row) => ({ ...row, recordUrl: '/' + row.Id }));
            this.errorMessage = undefined;
        } else if (value.error) {
            this.rows = [];
            this.errorMessage = 'Claims could not be loaded. Check your ClaimGuard permissions.';
        }
    }

    @wire(getSummary)
    wiredSummary(value) {
        this.summaryWire = value;
        if (value.data) this.summary = value.data;
    }

    get statusOptions() {
        return ['All', 'New', 'InReview', 'Resolved', 'Rejected'].map((value) => ({ label: value, value }));
    }

    get canCreate() { return this.claimObjectInfo?.data?.createable === true; }
    get canStartReview() { return this.claimObjectInfo?.data?.updateable === true && this.selected?.Status__c === 'New'; }
    get canClose() { return this.claimObjectInfo?.data?.updateable === true && this.selected?.Status__c === 'InReview'; }
    get empty() { return this.rows.length === 0 && !this.errorMessage; }
    get noAudit() { return this.audit.length === 0 && !this.auditLoading; }
    get rowCount() { return this.rows.length; }

    handleFilter(event) { this.statusFilter = event.detail.value; }
    handleSearch(event) {
        const value = event.target.value;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => { this.searchTerm = value; }, 300);
    }
    disconnectedCallback() { clearTimeout(this.searchTimer); }

    async refresh() {
        this.busy = true;
        try {
            await Promise.all([refreshApex(this.claimsWire), refreshApex(this.summaryWire)]);
        } catch (error) {
            this.toast('Refresh failed', 'Refresh the page and check your access.', 'error');
        } finally { this.busy = false; }
    }

    async handleRowAction(event) {
        this.selected = { ...event.detail.row };
        this.resolution = this.selected.Resolution__c || '';
        this.audit = [];
        this.auditLoading = true;
        const claimId = this.selected.Id;
        try {
            const entries = await getAudit({ claimId });
            if (this.selected?.Id === claimId) this.audit = entries;
        } catch (error) {
            this.toast('Audit unavailable', 'The audit history could not be loaded.', 'error');
        } finally { this.auditLoading = false; }
    }

    closeDetail() { if (!this.busy) this.selected = undefined; }
    handleResolution(event) { this.resolution = event.target.value; }
    startReview() { this.advance('InReview'); }
    resolve() { this.advance('Resolved'); }
    reject() { this.advance('Rejected'); }

    async advance(nextStatus) {
        if (['Resolved', 'Rejected'].includes(nextStatus) && this.resolution.trim().length < 20) {
            this.toast('Add a resolution', 'Write at least 20 characters explaining the decision.', 'warning');
            return;
        }
        this.busy = true;
        try {
            await transitionClaim({ claimId: this.selected.Id, expectedStatus: this.selected.Status__c, nextStatus, resolution: this.resolution });
            this.selected = undefined;
            this.toast('Claim updated', 'The change and its audit event were saved.', 'success');
            await this.refresh();
        } catch (error) {
            this.toast('Update failed', error?.body?.message || 'Refresh the claim and check your access.', 'error');
        } finally { this.busy = false; }
    }

    openCreate() { this.showCreate = true; }
    closeCreate() { if (!this.busy) this.showCreate = false; }
    handleSubmit() { this.busy = true; }
    async handleCreated() {
        this.showCreate = false;
        this.toast('Claim created', 'Priority, deadline and the first audit event were generated.', 'success');
        await this.refresh();
    }
    handleFormError() {
        this.busy = false;
        this.toast('Claim not saved', 'Check the form errors, references and idempotency key.', 'error');
    }
    toast(title, message, variant) { this.dispatchEvent(new ShowToastEvent({ title, message, variant })); }
}
