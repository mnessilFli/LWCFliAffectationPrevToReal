import { LightningElement, track, api } from 'lwc';
import getAffectationData from '@salesforce/apex/AffectationControllerPlanification.getAffectationData';
import createAffectations from '@salesforce/apex/AffectationControllerPlanification.createAffectations';
import getAlreadyScheduledDays from '@salesforce/apex/AffectationControllerPlanification.getAlreadyScheduledDays';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CreateAffectationPlanified extends LightningElement {
    @api recordId;
    @track currentAffaire = '';
    @track currentTiers = '';
    @track currentRessource = '';
    currentMonth = '';
    currentYear = '';
    scheduledDays = '';
    @track currentDuree = '';
    @track lines = [
        { id: 1, ligneAffaire: '', startDate: '', duration: 0, quart: '9' }
    ];
    @track affaireLines = [];
    @track isLoading = false;
    @track totalPlannedDays = 0;

    connectedCallback() {
        this.isLoading = true;
        getAffectationData({ recordId: this.recordId })
            .then((data) => {
                this.currentAffaire = data.affaire;
                this.currentTiers = data.tiers;
                this.currentRessource = data.RessourceHumaine;
                this.currentDuree = data.NombreJours ? data.NombreJours.toString() : 'Non disponible';
                this.currentMonth = data.Mois;
                this.currentYear = data.Annee;

                this.affaireLines = data.affaireLines.map((line) => ({
                    label: line.Name,
                    value: line.Id,
                    price: line.PrixDeLaJournee__c,
                    color: line.CodeCouleur__c,
                }));

                this.refreshScheduledDays();
                this.updateTotalPlannedDays();
            })
            .catch(() => {
                this.showToast('Erreur', 'Erreur lors de la récupération des données', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    refreshScheduledDays() {
        getAlreadyScheduledDays({ planificationId: this.recordId, month: this.currentMonth, year: this.currentYear })
            .then((days) => {
                this.scheduledDays = days;
            })
            .catch(() => {
                this.showToast('Erreur', 'Impossible de calculer les jours planifiés.', 'error');
            });
    }

    get remainingToPlan() {
        const total = parseFloat(this.currentDuree) || 0;
        const scheduled = parseFloat(this.scheduledDays) || 0;
        const planned = parseFloat(this.totalPlannedDays) || 0;
        return Math.max(0, (total - scheduled - planned).toFixed(2));
    }

    get quartOptions() {
        return [
            { label: '9h00', value: '9' },
            { label: '11h00', value: '11' },
            { label: '14h00', value: '14' },
            { label: '16h00', value: '16' }
        ];
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleLineChange(event) {
        const field = event.target.name;
        const value = event.target.value;
        const id = event.target.dataset.id;
        const line = this.lines.find((l) => l.id === parseInt(id, 10));
        if (line) {
            line[field] = field === 'duration' ? parseFloat(value) : value;
        }
        this.updateTotalPlannedDays();
    }

    addNewLine() {
        const newId = this.lines.length > 0 ? Math.max(...this.lines.map(l => l.id)) + 1 : 1;
        this.lines = [
            ...this.lines,
            { id: newId, ligneAffaire: '', startDate: '', duration: 0, quart: '9' }
        ];
        this.updateTotalPlannedDays();
    }

    removeLine(event) {
        const id = parseInt(event.target.dataset.id, 10);
        this.lines = this.lines.filter((line) => line.id !== id);
        this.updateTotalPlannedDays();
    }

    updateTotalPlannedDays() {
        this.totalPlannedDays = this.lines.reduce((sum, line) => sum + (parseFloat(line.duration) || 0), 0);
    }

    createAffectations() {
        this.isLoading = true;
        const payload = this.lines.map((line) => ({
            ligneAffaire: line.ligneAffaire,
            startDate: line.startDate,
            duration: parseFloat(line.duration),
            quart: line.quart
        }));

        createAffectations({ planificationId: this.recordId, affectationPayload: payload })
            .then(() => {
                this.showToast('Succès', 'Affectations créées avec succès.', 'success');
                this.lines = [{ id: 1, ligneAffaire: '', startDate: '', duration: 0, quart: '9' }];
                this.refreshScheduledDays();
                this.updateTotalPlannedDays();
            })
            .catch(() => {
                this.showToast('Erreur', 'Erreur lors de la création des affectations.', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

  