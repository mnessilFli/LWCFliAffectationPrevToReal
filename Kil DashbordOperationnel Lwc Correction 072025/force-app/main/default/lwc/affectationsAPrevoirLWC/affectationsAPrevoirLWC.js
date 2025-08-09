import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getRessourceHumaineFromUser from
    '@salesforce/apex/AffectationPlanificationController.getRessourceHumaineFromUser';
import getAffectationsPlanification from
    '@salesforce/apex/AffectationPlanificationController.getAffectationsPlanification';
import getAlreadyScheduledDays from
    '@salesforce/apex/AffectationControllerPlanification.getAlreadyScheduledDays';

export default class AffectationsAPrevoirLWC extends LightningElement {
    @track groupedAffectations = [];
    @track loading   = true;
    @track showModal = false;
    @track modalRecordData;

    ressourceId;
    currentMonth = new Date().getMonth() + 1;
    currentYear  = new Date().getFullYear();
    selectedAffaireId = null;   // Id de la ligne cochée

    monthLabels = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet',
                   'Août','Septembre','Octobre','Novembre','Décembre'];

    /* ---------- getters UI ---------- */
    get displayedMonthLabel() {
        return `${this.monthLabels[this.currentMonth - 1]} ${this.currentYear}`;
    }
    get isAddDisabled() {
        return !this.groupedAffectations.some(a => a.isSelected);
    }
    get totalJoursPrevus() {
        return this.groupedAffectations.reduce((s, a) => s + (a.NombreJours__c   || 0), 0);
    }
    get totalJoursPlanifies() {
        return this.groupedAffectations.reduce((s, a) => s + (a.scheduledDays    || 0), 0);
    }
    get totalRestant() {
        return this.groupedAffectations.reduce((s, a) => s + (a.remainingDays    || 0), 0);
    }

    /* ---------- lifecycle ---------- */
    connectedCallback() { this.initData(); }

    async initData() {
        try {
            this.loading    = true;
            this.ressourceId = await getRessourceHumaineFromUser();
            await this.loadAffectations();
        } catch (e) {
            this.showToast('Erreur', 'Impossible de récupérer les données.', 'error');
            console.error(e);
        } finally { this.loading = false; }
    }

    /* ---------- load & group ---------- */
    async loadAffectations() {
        this.loading          = true;
        this.selectedAffaireId = null;

        try {
            const base = await getAffectationsPlanification({
                ressourceId : this.ressourceId,
                mois        : this.currentMonth,
                annee       : this.currentYear
            });

            /* récup des jours planifiés */
            const schedPromises = base.map(a =>
                getAlreadyScheduledDays({
                    planificationId : a.Id,
                    month           : a.Mois__c,
                    year            : a.Annee__c
                })
            );
            const schedValues = await Promise.all(schedPromises);

            /* regroupement par affaire */
            const grouped = new Map();
            base.forEach((a, idx) => {
                const key       = a.Affaire__c;
                const scheduled = schedValues[idx] || 0;

                if (!grouped.has(key)) {
                    grouped.set(key, {
                        affaireId     : a.Affaire__c,
                        affaireName   : a.Affaire__r?.Name || '',
                        tiersName     : a.Tiers__r?.Name   || '',
                        NombreJours__c: 0,
                        scheduledDays : 0,
                        CodeCouleur__c: a.CodeCouleur__c,
                        mois          : a.Mois__c,
                        annee         : a.Annee__c
                    });
                }
                const entry = grouped.get(key);
                entry.NombreJours__c += a.NombreJours__c || 0;
                entry.scheduledDays  += scheduled;
            });

            this.groupedAffectations = Array.from(grouped.values()).map(a => ({
                ...a,
                remainingDays: Math.max(0, a.NombreJours__c - a.scheduledDays),
                isSelected   : false                 // contrôle de la case
            }));

        } catch (e) {
            console.error(e);
            this.showToast('Erreur', 'Chargement des affectations impossible.', 'error');
        } finally { this.loading = false; }
    }

    /* ---------- navigation mois ---------- */
    handlePreviousMonth() {
        if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
        else                           { this.currentMonth--; }
        this.loadAffectations();
    }
    handleNextMonth() {
        if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
        else                           { this.currentMonth++; }
        this.loadAffectations();
    }

    /* ---------- sélection checkbox ---------- */
    handleCheckboxChange(event) {
        const id      = event.target.value;
        const checked = event.target.checked;

        this.selectedAffaireId   = checked ? id : null;
        this.groupedAffectations = this.groupedAffectations.map(a => ({
            ...a,
            isSelected: checked && a.affaireId === id
        }));
    }

    /* ---------- action planification ---------- */
    handleAddToPlanning() {
        const sel = this.groupedAffectations.find(a => a.isSelected);
        if (!sel) {
            this.showToast('Erreur', 'Aucune affectation sélectionnée.', 'error');
            return;
        }
        /* recordData pour le composant modal */
        this.modalRecordData = JSON.stringify([
            sel.affaireId,
            'Affaire__c',
            sel.CodeCouleur__c,
            this.ressourceId
        ]);
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        setTimeout(() => this.loadAffectations(), 300);
        eval("$A.get('e.force:refreshView').fire();"); // petit délai pour laisser le save finir
    }

    /* ---------- utils ---------- */
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
