import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getRessourceHumaineFromUser from
    '@salesforce/apex/AffectationPlanificationController.getRessourceHumaineFromUser';
import getAffectationsPlanification from
    '@salesforce/apex/AffectationPlanificationController.getAffectationsPlanification';
import getAlreadyScheduledDays from
    '@salesforce/apex/AffectationControllerPlanification.getAlreadyScheduledDays';

export default class AffectationsAPrevoirLWC extends LightningElement {
    /* ---------------- state ---------------- */
    @track affectations = [];
    @track loading = true;

    ressourceId;
    currentMonth = new Date().getMonth() + 1;
    currentYear  = new Date().getFullYear();

    showModal = false;
    modalRecordData;       // stringifié => attr du composant modal

    /* ------------- labels -------------- */
    monthLabels = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet',
                   'Août','Septembre','Octobre','Novembre','Décembre'];

    /* ------------- lifecycle ------------- */
    connectedCallback() { this.initData(); }

    /* ------------- computed -------------- */
    get displayedMonthLabel() {
        return `${this.monthLabels[this.currentMonth - 1]} ${this.currentYear}`;
    }
    get isAddDisabled() {
        return !this.affectations.some(a => a.isSelected);
    }

    /* ------------- Apex ------------------ */
    async initData() {
        try {
            this.loading = true;
            this.ressourceId = await getRessourceHumaineFromUser();
            await this.loadAffectations();
        } catch (e) {
            this.showToast('Erreur','Impossible de récupérer les données.','error');
            console.error(e);
        } finally { this.loading = false; }
    }

    async loadAffectations() {
        this.loading = true;
        try {
            const base = await getAffectationsPlanification({
                ressourceId : this.ressourceId,
                mois        : this.currentMonth,
                annee       : this.currentYear
            });

            /* promet les jours planifiés */
            const schedPromises = base.map(a =>
                getAlreadyScheduledDays({
                    planificationId : a.Id,
                    month           : a.Mois__c,
                    year            : a.Annee__c
                })
            );
            const schedValues = await Promise.all(schedPromises);

            /* enrichissement */
            this.affectations = base.map((a, idx) => {
                const scheduled = schedValues[idx] || 0;
                return {
                    ...a,
                    isSelected    : false,
                    scheduledDays : scheduled,
                    remainingDays : Math.max(0, (a.NombreJours__c || 0) - scheduled),
                    TiersName     : a.Tiers__r   ? a.Tiers__r.Name   : '',
                    AffaireName   : a.Affaire__r ? a.Affaire__r.Name : ''
                };
            });
        } catch (e) {
            console.error(e);
            this.showToast('Erreur','Chargement des affectations impossible.','error');
        } finally { this.loading = false; }
    }

    /* ----------- pagination mois ---------- */
    handlePreviousMonth() {
        if (this.currentMonth === 1) {
            this.currentMonth = 12; this.currentYear--;
        } else { this.currentMonth--; }
        this.loadAffectations();
    }
    handleNextMonth() {
        if (this.currentMonth === 12) {
            this.currentMonth = 1; this.currentYear++;
        } else { this.currentMonth++; }
        this.loadAffectations();
    }

    /* --------- sélection & action --------- */
    handleCheckboxChange(event) {
        const id = event.target.dataset.id;
        const checked = event.target.checked;
        this.affectations = this.affectations.map(a =>
            a.Id === id ? { ...a, isSelected: checked } : a
        );
    }

handleAddToPlanning() {
    // 1. on repère les lignes cochées
    const selected = this.affectations.filter(a => a.isSelected);

    // 2. une seule case cochée
    if (selected.length !== 1) {
        this.showToast(
            'Erreur',
            'Merci de sélectionner **une seule** affectation.',
            'error'
        );
        return;
    }

    const planif = selected[0];

    /* 3. recordData pour le composant enfant
       -------------------------------------------------
       • index 0 : Id de **l’Affaire**
       • index 1 : 'Affaire__c'          -> le composant renseignera Tiers + Affaire
       • index 2 : couleur (optionnel)
       • index 3 : Id de la Ressource   -> le composant la retrouve dans setDefaultValues
    */
    this.modalRecordData = JSON.stringify([
        planif.Affaire__c,          // Id de l’Affaire
        'Affaire__c',               // contexte → Tiers + Affaire
        planif.CodeCouleur__c,      // couleur par défaut si besoin
        this.ressourceId            // Ressource humaine pré-sélectionnée
    ]);

    // 4. ouverture de la modale
    this.showModal = true;
}



    closeModal() {
        this.showModal = false;
        /* rafraîchit la liste (ex : si une création vient d’être faite) */
        this.loadAffectations();
    }

    /* ------------- utils --------------- */
    showToast(title,msg,variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message: msg, variant }));
    }
}
