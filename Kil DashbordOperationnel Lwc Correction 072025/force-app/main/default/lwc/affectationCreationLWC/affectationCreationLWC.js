

import { LightningElement, api, wire } from "lwc";
import { reduceErrors } from "c/ldsUtils";
import { createRecord, updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import apexSearchAccounts from "@salesforce/apex/LookupController.searchAccounts";
import apexSearchAffaires from "@salesforce/apex/LookupController.searchAffaires";
import apexSearchAllAffaire from "@salesforce/apex/LookupController.searchAllAffaireFromTiersId";
import apexSearchLigneAffaires from "@salesforce/apex/LookupController.searchLigneAffaire";
import apexSearchAllLigneAffaire from "@salesforce/apex/LookupController.searchAllLigneAffaireFromAffaireId";
import apexSearchRessource from "@salesforce/apex/LookupController.searchRessource";
// import apexGetMaterialRessourceSelection from "@salesforce/apex/LookupController.apexGetMaterialRessourceSelection";
import createSearchResultRessourceFromHostRecord from "@salesforce/apex/LookupController.createSearchResultRessourceFromHostRecord";
import createSearchResultTiersFromHostRecord from "@salesforce/apex/LookupController.createSearchResultTiersFromHostRecord";
import createSearchResultAffaireFromHostRecord from "@salesforce/apex/LookupController.createSearchResultAffaireFromHostRecord";
import createSearchResultLigneAffaireFromHostRecord from "@salesforce/apex/LookupController.createSearchResultLigneAffaireFromHostRecord";
import getSimpleAffectationDataFromHostRecord from "@salesforce/apex/LookupController.getSimpleAffectationDataFromHostRecord";
import apexSearchTiersFromRessourceHId from "@salesforce/apex/LookupController.createSearchResultTiersFromRessource";
import getRessourceMinMaxDates from "@salesforce/apex/LookupController.getRessourceMinMaxDates";
import getBusinessPlanningFromRessourceHId from "@salesforce/apex/LookupController.getBusinessPlanningFromRessourceHId";
import getBusinessPlanningFromRessourceMId from "@salesforce/apex/LookupController.getBusinessPlanningFromRessourceMId";
import getColorFromLigneAffaireId from "@salesforce/apex/LookupController.getColorFromLigneAffaireId";
import getAffaireUniteDeFacturation from "@salesforce/apex/LookupController.getAffaireUniteDeFacturation";
import getPriceFromLigneAffaireId from "@salesforce/apex/LookupController.getPriceFromLigneAffaireId";
import getFacturationOptionFromLigneAffaireId from "@salesforce/apex/LookupController.getFacturationOptionFromLigneAffaireId";
import getAffaireFacturabledDaysLeft from "@salesforce/apex/LookupController.getAffaireFacturabledDaysLeft";
// import getBaseURL from "@salesforce/apex/LookupController.getBaseURL";
import apexCalculateBusinessHours from "@salesforce/apex/ElapsedTime.GetElapsedBusinessHours";
import getFieldsFromObjecstWithoutId from "@salesforce/apex/ApexGeneralMethods.getFieldsFromObjecstWithoutId";
// import getObjectsWithConditions from "@salesforce/apex/ApexGeneralMethods.getObjectsWithConditions";
import checkIfAffectationisOverAnotherAffectationForTheRessource from "@salesforce/apex/LookupController.checkIfAffectationisOverAnotherAffectationForTheRessource";
import CalculateStartDateTimeAndEndDateTimeTimeWithIntegerDuration from "@salesforce/apex/ElapsedTime.CalculateStartDateTimeAndEndDateTimeTimeWithIntegerDurationForJS";
import CalculateEndDateTimeWithDecimalDuration from "@salesforce/apex/ElapsedTime.CalculateEndDateTimeWithDecimalDuration";
import setDateTimesFromDateAndTime from "@salesforce/apex/LookupController.GetDateTimes";
import returnCorrectCurrentOrNextDateTime from "@salesforce/apex/ElapsedTime.returnCorrectCurrentOrNextDateTime";
import returnCorrectCurrentOrNextDate from "@salesforce/apex/ElapsedTime.returnCorrectCurrentOrNextDate";
import getLieuGlobalPicklist from "@salesforce/apex/LookupController.getLieuGlobalPicklist";
import getLieuFromRH from "@salesforce/apex/LookupController.getLieuFromRH";



export default class HelloWorld extends LightningElement {

    // Permet de récupérer les données envoyées par affectationCalendar
    @api
    get recordData() {
        return this.recordData;
    }



    originalValue;
    set recordData(value) {
        // console.log("recordData recue :", value, typeof value, value.length);
        try {
            this.originalValue = JSON.parse(value);
        } catch (expectedError) {
            try {
                this.originalValue = JSON.parse(JSON.stringify(value));
                if (this.originalValue[0] === "") this.originalValue[0] = null;
            } catch (error) {
                console.log(
                    "error in parsing recordData from enclosing LWC",
                    error
                );
                console.log(JSON.stringify(error));
            }
        }

        this.setDefaultValues(this.originalValue);
    }

    // lors de l'ouverture de la fenêtre, permet de récupérer certaines données (heure et date de début car c'est le jour sur lequel l'utilisateur a cliqué)
    @api
    get modalOpeningData() {
        return this.modalOpeningData;
    }
    set modalOpeningData(value) {
        if (value != null) {
            // console.log("ModalOpeningData recue :", value);
            let startDate = value.match(/.+?(?=T)/)[0];
            let startTime = value.match(/(?<=T)(.*?)(?=\+)/)[0] + ".000";
            this.HoraireDateDebut = startDate;
            // On veut que la date de fin soit la même que celle de début à l'initialisation
            this.HoraireDateFin = this.HoraireDateDebut;
            this.HoraireHeureDebut = startTime;
            // On veut que l'hreure de fin soit la même que celle de début à l'initialisation
            this.HoraireHeureFin = this.HoraireHeureDebut;
            this.DateDebut = startDate;
        }
    }

    recordId;
    // On préfere utiliser des urls relatives qu'absolu pour rester dans le même subtab (voir e:forceNavigate)
    @api
    get recordUrl() {
        return `/lightning/r/Affectation__c/${this.createdAffectationId}/view`;
    }
    createdAffectationId;
    SObjectName;
    Name;
    RecordTypeId;
    editMode = false;
    DateTimeDebut = null;
    DateTimeFin = null;

    filterOnActive = true;
    async setDefaultRessourceResults() {
        // Set la liste de ressource par défault
        let parameters = {
            searchTerm: "",
            selectedIds: [],
            filterOnActive: this.filterOnActive
        };
        apexSearchRessource(parameters)
            .then((ressourceResultArray) => {
                // console.log("ressourceResultArray:", ressourceResultArray);
                let ressourceLookup = this.template.querySelector(
                    "c-lookup[data-id=ressourceSearch"
                );
                ressourceLookup.setSearchResults(ressourceResultArray);
                ressourceLookup.setDefaultResults(ressourceResultArray);
            })
            .catch((error) => {
                console.log("setDefaultRessourceResults lookup error");
                this.handleResponse(error);
            });

     
        // ).catch((error) => {
        //     console.log("getMaterialRessourceSelection lookup error");
        //     this.handleResponse(error);
        // });

        // let HRSelectionList = await getHumanRessourceSelection;
        // let MRSelectionList = await getMaterialRessourceSelection;

        // let ressourceLookup = this.template.querySelector(
        //     "c-lookup[data-id=ressourceSearch"
        // );

        // ressourceLookup.setSearchResults(
        //     HRSelectionList.concat(MRSelectionList)
        // );
        // ressourceLookup.setDefaultResults(
        //     HRSelectionList.concat(MRSelectionList)
        // );
    }

    ressourceSelection = [];
    rErrors = [];
    RBusinessPlanning;
    RessourceHId;
    RHRecordTypeName;
    RessourceMId;
    ressourceTooltip =
        this.filterOnActive === true
            ? "Sélection des ressources humaines avec filtre sur les ressources avec un poste de carrière actif."
            : "Sélection des ressources humaines sans aucun filtres.";

    updateRessourceId(event) {
      
        let uniqueSelection = event.target.getSelection()[0];
        if (uniqueSelection !== undefined) {
            if (
                uniqueSelection.sObjectType === "RessourceMaterielle__c"
            ) {
                // console.log("materialselection", uniqueSelection);
                this.RessourceMId = uniqueSelection.id;
                this.RessourceHId = null;
                this.ressourceMConsequence()
             
            } else if (
                uniqueSelection.sObjectType === "RessourceHumaine__c"
            ) {
                // console.log("humanselection", uniqueSelection);
                this.RessourceHId = uniqueSelection.id;
                this.RessourceMId = null;
                this.ressourceHConsequence()
                 
            }
        } else {
            this.RessourceHId = null;
            this.RessourceMId = null;
        }
    }

    async ressourceHConsequence() {
        // console.log('ressourceHConsequence')

        this.showFacturation = true;

        // Si la ressource est un externe, on met par défaut son tiers dans la liste des tiers choisis
        await apexSearchTiersFromRessourceHId({
            ressourcehId: this.RessourceHId
        })
            .then((accResult) => {
                if (accResult) {
                    this.tiersSelection = accResult;
                    this.TiersID = accResult.Id;
                    this.tiersConsequences();
                }}) 

        // On récupère le planning de la ressource (ou le planning par défaut si la ressource n'en a pas)
        await this.getBusinessPlanningFromRessourceHId()
            .then(async () => {
                this.calculateDuree()
                    .then(this.CalculateEndDate())
                    .then(this.heureDebutOptions())
                    
            })
           

        await this.getRessourceLieu()
            .then(async (lieu) => {
                // console.log('getRessourceLieu results:', lieu)
                if (!lieu) lieu = this.DefaultLieu;
                // console.log('lieu:', lieu)
                this.template.querySelector(
                    "lightning-combobox[data-id=LieuSelection"
                ).value = lieu;
                this.Lieu = lieu;
                this.lieuConsequences();
            })
         

        await this.getRessourceMinMaxDates();

        this.setValidationButtonsVisibility(true);
    }

    async ressourceMConsequence() {
        // console.log("ressourceMConsequence");

        // On récupère le planning de la ressource matérielle
        await this.getBusinessPlanningFromRessourceMId()
            .then(async () => {
                this.calculateDuree()
                    .then(this.CalculateEndDate())
                    .then(this.heureDebutOptions())
                    .catch((error) => {
                        console.log(
                            "getBusinessPlanningFromRessourceMId lookup error"
                        );
                        this.handleResponse(error);
                    });
            })
            .catch((error) => {
                console.log("ressourceMConsequence error :");
                this.handleResponse(error);
            });

        if (this.LigneAffaireId === null) {
            this.BonDeLivraison = "Non";
            this.bonDeLivraisonConsequences();
            this.showFacturation = false;
        }

        this.minDateFromPC = null;
        this.maxDateFromPC = null;
        this.minMaxDatesFromPCErrorMessage = null;

        this.setValidationButtonsVisibility(true);
    }

    async getBusinessPlanningFromRessourceHId() {
        return getBusinessPlanningFromRessourceHId({ rhId: this.RessourceHId })
            .then((results) => {
                console.log(JSON.stringify(results));
                results = JSON.parse(results);

                console.log(results);
                //console.log(results.bhId);
                //console.log(results.message);

                this.RBusinessPlanning = results.bhId;
                console.log('bhid (mnl) : '+ this.RBusinessPlanning);
                let errorMessage = results.message;

            })
            
    }

    async getBusinessPlanningFromRessourceMId() {
        return getBusinessPlanningFromRessourceMId({ rmId: this.RessourceMId })
            .then((results) => {
                results = JSON.parse(results);
                this.RBusinessPlanning = results.bhId;
                let errorMessage = results.message;
                //this.addRError(errorMessage, "BusinessPlanning");
            })
            .catch((error) => {
                console.log("getBusinessPlanningFromRessourceMId error :");
                this.handleResponse(error);
            });
    }

    async getRessourceLieu() {
        return getLieuFromRH({
            rhId: this.RessourceHId
        });
    }

    minDateFromPC;
    maxDateFromPC;
    minMaxDatesFromPCErrorMessage;
    async getRessourceMinMaxDates() {
        getRessourceMinMaxDates({
            ressourcehId: this.RessourceHId
        }).then((dates) => {
            // console.log("dates:", dates);
            this.minDateFromPC = dates[0] === "" ? null : dates[0];
            this.maxDateFromPC = dates[1] === "" ? null : dates[1];
            this.minMaxDatesFromPCErrorMessage =
                dates[2] === "" ? null : dates[2];
            /*this.addRError(
                this.minMaxDatesFromPCErrorMessage,
                "MinMaxDatesFromPC"
            );*/
        });
    }

    addRError(message, idError) {
        if (this.rErrors.find((obj) => obj.id === idError))
            this.rErrors.forEach((obj, numero) => {
                if (obj.id === idError)
                    this.rErrors[numero] = {
                        id: idError,
                        message: message
                    };
            });
        else
            this.rErrors.push({
                id: idError,
                message: message
            });
        this.setRErrors();
    }

    setRErrors() {
        this.template.querySelector(
            "c-lookup[data-id=ressourceSearch]"
        ).errors = this.rErrors;
    }

    setDefaultTiersResults() {
        let parameters = {
            searchTerm: "",
            selectedIds: []
        };
        // Set la liste de tiers par défault
        apexSearchAccounts(parameters)
            .then((results) => {
                this.template
                    .querySelector("c-lookup[data-id=tiersSearch")
                    .setSearchResults(results);
                this.template
                    .querySelector("c-lookup[data-id=tiersSearch")
                    .setDefaultResults(results);
            })
            .catch((error) => {
                console.log("setDefaultTiersResults lookup error");
                this.handleResponse(error);
            });
    }

    tiersSelection = [];
    TiersID;
    updateTiersID(event) {
        let uniqueSelection = event.target.getSelection()[0];
        if (uniqueSelection) {
            this.TiersID = uniqueSelection.id;
            this.tiersConsequences();
        } else this.TiersID = null;
    }

    async tiersConsequences() {
        this.setDefaultAffaireResults();
        this.setValidationButtonsVisibility(true);
    }

    affaireSelection = [];
    AffaireID;
    affaireDayLeft;
    affaireErrors = [];
    updateAffaireID(event) {
        let uniqueSelection = event.target.getSelection()[0];
        if (uniqueSelection) {
            this.AffaireID = uniqueSelection.id;
            this.affaireConsequences();
        } else
            console.log(
                "Erreur dans la saisie de l'affaire (updateAffaireID)"
            );
    }

    async affaireConsequences() {
        getAffaireUniteDeFacturation({
            AffaireId: this.AffaireID
        })
            .then((results) => {
                if (results === "Jour") this.saisieHoraire = false;
                else if (results === "Heure") this.saisieHoraire = true;
                this.getAffaireFacturabledDaysLeft();
            })
            .catch((error) => {
                console.log(
                    "getAffaireUniteDeFacturation lookup error (affaireConsequences)"
                );
                this.handleResponse(error);
            });

        this.setDefaultLigneAffaireResults();
        this.setValidationButtonsVisibility(true);
    }

    async getAffaireFacturabledDaysLeft() {
        getAffaireFacturabledDaysLeft({
            AffaireId: this.AffaireID
        })
            .then((results) => {
                let errorMessage;
                this.affaireDayLeft = results;
                let unite =
                    this.saisieHoraire === true ? "heure(s)" : "jour(s)";
                if (results <= 0) {
                    errorMessage = "Il ne reste plus ";
                    errorMessage +=
                        this.saisieHoraire === true ? "d'heures" : "de jours";
                    errorMessage +=
                        " facturables dans cette affaire (" +
                        results +
                        " " +
                        unite +
                        " restants)";
                } else
                    errorMessage =
                        "Il reste " +
                        results +
                        " " +
                        unite +
                        " dans cette affaire";

                this.addAffaireErrors(errorMessage, "daysLeft");
            })
            .catch((error) => {
                console.log("getAffaireFacturabledDaysLeft lookup error");
                this.handleResponse(error);
            });
    }

    addAffaireErrors(message, idError) {
        if (this.affaireErrors.find((obj) => obj.id === idError))
            this.affaireErrors.forEach((obj, numero) => {
                if (obj.id === idError)
                    this.affaireErrors[numero] = {
                        id: idError,
                        message: message
                    };
            });
        else
            this.affaireErrors.push({
                id: idError,
                message: message
            });
        this.setAffaireErrors();
    }

    setAffaireErrors() {
        this.template.querySelector("c-lookup[data-id=affairesSearch]").errors =
            this.affaireErrors;
    }

    async setDefaultAffaireResults() {
        if (this.TiersID !== undefined) {
            // Quand le tiers est rentré, set la liste par défaut d'affaire
            let parameters = {
                IdTiers: this.TiersID
            };
            apexSearchAllAffaire(parameters)
                .then((results) => {
                    this.template
                        .querySelector("c-lookup[data-id=affairesSearch]")
                        .setSearchResults(results);
                    this.template
                        .querySelector("c-lookup[data-id=affairesSearch]")
                        .setDefaultResults(results);
                })
                .catch((error) => {
                    console.log("setDefaultAffaireResults lookup error");
                    this.handleResponse(error);
                });
        } else
            this.template
                .querySelector("c-lookup[data-id=affairesSearch")
                .setSearchResults([]);
    }

    ligneAffaireSelection = [];
    LigneAffaireId = null;
    updateligneAffaireID(event) {
        let uniqueSelection = event.target.getSelection()[0];
        if (uniqueSelection !== undefined) {
            this.LigneAffaireId = uniqueSelection.id;
            this.ligneAffaireConsequences();
            this.Titre = uniqueSelection.title;
            this.titreConsequences();
        } else {
            this.LigneAffaireId = null;
            this.ligneAffaireConsequences();
        }
        this.setDefaultLigneAffaireResults();
    }

    async ligneAffaireConsequences() {
        if (this.LigneAffaireId !== null) {
            this.showFacturation = true;
            this.BonDeLivraison = "Oui";
            this.bonDeLivraisonConsequences();

            Promise.resolve()
                .then(() => {
                    // On récupère la couleur de la ligne de l'affaire (ou celle de la famille de type de tâche, ou tout blanc)
                    this.getCouleurFromLigneAffaireId(this.LigneAffaireId)
                        .then(() => {
                            // On copie le titre de la ligne de l'affaire sur le titre de l'affectation
                            this.template.querySelector(
                                "lightning-input[data-id=Titre]"
                            ).value = this.Titre;

                            // On copie le titre de la ligne de l'affaire sur le libellé de facturation
                            this.template.querySelector(
                                "lightning-input[data-id=LibelleFacture]"
                            ).value = this.Titre;

                            // On reset le flag de customization du libellé de facturation
                            this.hasLibelleFactureBeenManuallyEdited = false;
                        })
                        .catch((error) => {
                            console.log(
                                "ligneAffaireConsequences lookup error"
                            );
                            this.handleResponse(error);
                        });

                    // On récupère le prix et si l'affaire est facturable ou non
                    this.getPriceFromLigneAffaireId(this.LigneAffaireId);
                    this.getFacturationOptionFromLigneAffaireId(
                        this.LigneAffaireId
                    );
                })
                .then(this.setValidationButtonsVisibility(true));
        } else {
            if (this.RessourceMId && this.RessourceHId === null) {
                this.BonDeLivraison = "Non";
                this.bonDeLivraisonConsequences();
                // Le mettre après parcequ'avant ca déclenche l'erreur "TypeError: Cannot set property 'value' of null" parcequ'on set un champ non visible
                this.showFacturation = false;
            } else {
                this.showFacturation = true;
                this.BonDeLivraison = "Oui";
                this.bonDeLivraisonConsequences();
            }
            this.setValidationButtonsVisibility(true);
        }
    }

    async setDefaultLigneAffaireResults() {
        if (this.AffaireID !== undefined) {
            // Quand l'affaire est rentrée, set la liste par défaut de lignes d'affaire
            let parameters = {
                IdAffaire: this.AffaireID
            };
            apexSearchAllLigneAffaire(parameters)
                .then((results) => {
                    this.template
                        .querySelector("c-lookup[data-id=ligneAffairesSearch]")
                        .setSearchResults(results);
                    this.template
                        .querySelector("c-lookup[data-id=ligneAffairesSearch]")
                        .setDefaultResults(results);
                })
                .catch((error) => {
                    console.log("setDefaultLigneAffaireResults lookup error");
                    this.handleResponse(error);
                });
        } else
            this.template
                .querySelector("c-lookup[data-id=ligneAffairesSearch")
                .setSearchResults([]);
    }

    Titre;
    updateTitre(event) {
        this.Titre = event.target.value;
        this.titreConsequences();
    }

    titreConsequences() {
        if (
            this.hasLibelleFactureBeenManuallyEdited === false &&
            this.showFacturation === true
        ) {
            this.Libelle = this.Titre;
            this.libelleConsequences();
            this.template.querySelector(
                'lightning-input[data-id="LibelleFacture"]'
            ).value = this.Titre;
        }
        this.setValidationButtonsVisibility(true);
    }

    Couleur;
    isCouleurReadOnly = false;
    updateCouleur(event) {
        this.Couleur = event.target.value;
        this.couleurConsequences();
    }

    couleurConsequences() {
        this.setValidationButtonsVisibility(true);
    }

    async getCouleurFromLigneAffaireId(ligneAffaireId) {
        let parameter = {
            ligneAffaireId: ligneAffaireId
        };
        getColorFromLigneAffaireId(parameter)
            .then((results) => {
                if (!this.isCouleurReadOnly) {
                    this.Couleur = results;
                    this.couleurConsequences();
                    this.template.querySelector(
                        "lightning-input[data-id=Couleur"
                    ).value = results;
                }
            })
            .catch((error) => {
                console.log("getColorFromLigneAffaireId lookup error");
                this.handleResponse(error);
            });
    }

    Description;
    updateDescription(event) {
        this.Description = event.target.value;
        this.descriptionConsequences();
    }

    descriptionConsequences() {
        this.setValidationButtonsVisibility(true);
    }

    Previsionnel = false;
    updatePrevisionnel(event) {
        console.log('updatePrevisionnel : ', event.target.checked)
        this.Previsionnel = event.target.checked;
        this.previsionnelConsequences();
    }

    previsionnelConsequences() {
        // console.log('previsionnelConsequences')
        if (this.Previsionnel) {
            // Mettre la couleur à gris
            this.Couleur = this.previsionnelColor;
            this.couleurConsequences();
            // Mettre le champ couleur en read-only
            this.isCouleurReadOnly = true;
        } else {
            // Enlever le read only de la couleur
            this.isCouleurReadOnly = false;
            // Reprendre la couleur de la ligne de l'affaire
            this.getCouleurFromLigneAffaireId(this.LigneAffaireId);
        }
    }

    Astreinte = false;
    astr = true;
   
    IsDureeReadOnly = false;
    updateAstreinte(event) {
        this.Astreinte = event.target.checked;
        this.astreinteConsequences();
    }

    async astreinteConsequences() {
        if (this.Astreinte === true) {
            this.IsDureeReadOnly = false;
            this.saisieHoraire = true;
            this.HoraireDuree = null;
            this.horaireDureeConsequences()
                .then(this.setValidationButtonsVisibility(true))
                .catch((error) => {
                    console.log("horaireDureeConsequences lookup error");
                    this.handleResponse(error);
                });
        } else {
            this.IsDureeReadOnly = true;
            getAffaireUniteDeFacturation({
                AffaireId: this.AffaireID
            })
                .then((results) => {
                    if (results === "Jour") this.saisieHoraire = false;
                    else if (results === "Heure") this.saisieHoraire = true;
                    this.calculateDuree().then(this.setValidationButtonsVisibility(true));
                })
                .catch((error) => {
                    console.log("getAffaireUniteDeFacturation error");
                    this.handleResponse(error);
                });
        }
    }

    HoraireDateDebut = null;
    updateHoraireDateDebut(event) {
        // console.log('Date de début :')
        // console.log(event.target.value)
        this.HoraireDateDebut = event.target.value;

        console.log('KIL2022 this.Astreinte : '+this.Astreinte);
       

        if(this.Astreinte===false){        

            this.horaireDateDebutConsequences();

        }

    }

    async horaireDateDebutConsequences() {
        await this.setCorrectHoraireDateDebutEtFin();
        await this.calculateDuree();
        await this.setValidationButtonsVisibility(true);
    }

    DateDebut = null;
    updateDateDebut(event) {
        this.DateDebut = event.target.value;
        this.dateDebutConsequences();
    }

    dateDebutConsequences() {
        this.CalculateEndDate()
            .then(this.setValidationButtonsVisibility(true))
            .catch((error) => {
                console.log("CalculateEndDate lookup error");
                this.handleResponse(error);
            });
    }

    HoraireHeureDebut = "09:00:00";
    updateHoraireHeureDebut(event) {
        this.HoraireHeureDebut = event.target.value.replace("h", ":");

        console.log('KIL2022 this.Astreinte : '+this.Astreinte);
      

        if(this.Astreinte===false){        

            this.horaireHeureDebutConsequences();

        }
        
    }

    async horaireHeureDebutConsequences() {
        await this.setCorrectHoraireDateDebutEtFin();
        await this.calculateDuree();
        await this.setValidationButtonsVisibility(true);
    }

    HeureDebut = null;
    HeureOptions = [];
    isOverAnotherAffectation;
    messageIsOverAnotherAffectation;
    userHasAlreadySeenTheMessage = false;

    async heureDebutOptions() {
        // console.log('heureDebutOptions()')
        // Faire une requête pour avoir les horaires de début de l'organisation
        getFieldsFromObjecstWithoutId({
            ObjectAPIName: "TrancheHoraire__mdt",
            fieldsName: [
                "Ordre_d_apparition__c, Valeur_format_hh_mm__c, MasterLabel, BusinessHoursId__c, Tranche_Label__c"
            ]
        })
            .then((horairesMdt) => {
                let horaireArray = [];
                horairesMdt.forEach((trancheHoraire) => {
                    // console.log('trancheHoraire:', trancheHoraire)
                    if (
                        trancheHoraire.BusinessHoursId__c ===
                        this.RBusinessPlanning
                    )
                        // console.log('validée')
                        horaireArray[
                            trancheHoraire.Ordre_d_apparition__c
                        ] = {
                            value: trancheHoraire.Valeur_format_hh_mm__c,
                            //label: trancheHoraire.MasterLabel
                            label: trancheHoraire.Tranche_Label__c
                        };
                });

                horaireArray = horaireArray.filter((x) => {
                    return x !== undefined;
                });
                // console.log('horaireArray:', horaireArray)
                this.HeureOptions = horaireArray;
            })
            .catch((error) => {
                console.log("getFieldsFromObjecstWithoutId error");
                this.handleResponse(error);
            });
    }

    updateHeureDebut(event) {
        
        this.HeureDebut = event.detail.value;
      
        this.heureDebutConsequences();
        
    }

    async heureDebutConsequences() {
        this.CalculateEndDate()
            .then(this.setValidationButtonsVisibility(true))
            .catch((error) => {
                console.log("CalculateEndDate error");
                this.handleResponse(error);
            });
    }

    HoraireDuree = null;
    HoraireDureePlaceholder = "Entrez la durée ici...";

    updateHoraireDuree(event) {
        this.HoraireDuree = event.detail.value.replace(',', '.');

       
        
    }

    async horaireDureeConsequences() {
        this.calculateDuree()
            .then(this.setValidationButtonsVisibility(true))
            .catch((error) => {
                console.log("calculateDuree error");
                this.handleResponse(error);
            });
    }

    isDureeAnInteger = true;
    Duree = 0;
    stepDuree = 0.5;
    labelDuree = "Durée";
    dureeJourOverflowErrorMessage;
    updateDuree(event) {
        // console.log('durée écrite : ', event.target.value)
        // let duree = event.target.value.replace(',', '.').match(/^[+-]?\d+(\.\d*)?$/)
        // console.log('match', duree)
        // if (duree != null) duree = duree[0]
        // console.log('durée formatée', duree)
        this.Duree = event.target.value;
       
        this.Duree.replace(",", ".");
        console.log('Duree mnl:', this.Duree );
        this.dureeConsequences();
        console.log('this.affaireDaysLeft mnl:', this.affaireDayLeft );
        if (this.Duree > this.affaireDayLeft && this.Duree !== 0) {
            // console.log(this.Duree, ' > ', this.affaireDayLeft)
            //alert("Attention, la durée saisie dépasse le nombre de jours restants sur l'affaire sélectionnée.");
                
        } 
        
    }
        
        
    
    updateDureeInteger(event) {
        
        this.HeureDebut = event.target.value;
        this.dureeConsequences();
       
    }

    async dureeConsequences() {
       
        if (!this.Duree.includes(".") && !this.Duree.includes(",") && this.Duree !== 0){
            console.log('YGT this.Duree is an Integer') ;
            //this.Duree.toFixed(1) ;
            let text = this.Duree.toString() ;
            let dotZero = ".0";
            text.concat(dotZero) ;
            this.Duree = parseFloat(text) ;
        }
        console.log('YGT this.Duree : '+this.Duree.toString()) ;
        this.CalculateEndDate()
            .then(() => {
                if (this.Duree > this.affaireDayLeft && this.Duree !== 0) {
                    // console.log(this.Duree, ' > ', this.affaireDayLeft)
                    this.dureeJourOverflowErrorMessage =
                        "Attention, la durée saisie dépasse le nombre de jours restants sur l'affaire sélectionnée.";
                        
                } else {
                    // console.log(this.Duree, ' < ', this.affaireDayLeft)
                    this.dureeJourOverflowErrorMessage = "";
                }
                this.setdureeJourOverflowErrorMessage();
            })
            .catch((error) => {
                console.log("CalculateEndDate error");
                this.handleResponse(error);
            });
    }

    setdureeJourOverflowErrorMessage() {
        let messageHoraireHeureFin,
            messageHoraireDuree,
            messageHoraireJourFin,
            messageJourDuree;

        // Lorsque le champ est en readonly (que la durée est calculée automatiquement), on ne peut pas mettre de message d'erreur. Donc on le met sur les champs date de fin et heure de fin
        if (this.saisieHoraire === true && this.Astreinte === false) {
            messageHoraireJourFin = this.dureeJourOverflowErrorMessage;
            messageHoraireHeureFin = this.dureeJourOverflowErrorMessage;
            messageHoraireDuree = "";
        } else if (this.saisieHoraire === true && this.Astreinte === true) {
            messageHoraireJourFin = "";
            messageHoraireHeureFin = "";
            messageHoraireDuree = this.dureeJourOverflowErrorMessage;
        } else if (this.saisieHoraire === false) {
            messageJourDuree = this.dureeJourOverflowErrorMessage;
        }

        // On ne peut pas set des flags de champs qui ne sont pas affichés (balise template if false), ca throw une erreur
        if (this.saisieHoraire === true) {
            this.template
                .querySelector("lightning-input[data-id=HoraireHeureFin]")
                .setCustomValidity(messageHoraireHeureFin);
            this.template
                .querySelector("lightning-input[data-id=HoraireDuree]")
                .setCustomValidity(messageHoraireDuree);
            this.template
                .querySelector("lightning-input[data-id=HoraireJourFin]")
                .setCustomValidity(messageHoraireJourFin);
        } else if (this.saisieHoraire === false) {
            this.template
                .querySelector("lightning-input[data-id=JourDuree]")
                .setCustomValidity(messageJourDuree);
        }
    }

   
    async CalculateEndDate() {
        if (this.saisieHoraire === true || this.Duree === null) return;
        this.setCorrectDateDebut()
            .then(async () => {
                let duree = this.Duree.toString();
                if (duree.includes(".")) {
                    this.isDureeAnInteger = false;
                    // A déjà été set au préalable dès qu'on a choisi la ressource humaine
                    let picklist = this.template.querySelector(
                        "lightning-input[data-id=JourHoraireSelection]"
                    );
                    if (picklist) picklist.options = this.HeureOptions;
                } else this.isDureeAnInteger = true;

                // If the duration and the start date fields are filled
                if (duree != null && this.DateDebut != null) {
                    
                    if (this.HeureDebut != null) {
                        let integerPart ;
                        let floatPart ;
                        if(duree.includes(".")){
                            integerPart = duree.slice(
                                0,
                                duree.lastIndexOf(".")
                            ); // Récupère les jours
                            floatPart = duree.slice(
                                duree.lastIndexOf(".") + 1,
                                duree.length
                            ); // Récupère le décimal
                        } else {
                            integerPart = duree ;
                            floatPart = 0 ;
                        }

                        let parameters = {
                            startDateStr: this.DateDebut,
                            trancheHoraireStr: this.HeureDebut,
                            integerPartStr: integerPart,
                            decimalPartStr: floatPart,
                            bhId: this.RBusinessPlanning,
                            uniteFacturation: null,
                            recalcul: false
                        };
                        
                        await CalculateEndDateTimeWithDecimalDuration(
                            parameters
                        )
                            .then((results) => {
                                // console.log('CalculateEndDateTimeWithDecimalDuration results : ')
                                // console.log(results)

                                this.DateTimeDebut = results[0];

                                this.DateTimeFin = results[1];
                                let dateDeFin =
                                    this.DateTimeFin.split(" ")[0].split("-");
                                this.DateFin =
                                    dateDeFin[0] +
                                    "/" +
                                    dateDeFin[1] +
                                    "/" +
                                    dateDeFin[2];
                                this.dateFinConsequences();
                                this.HeureFin = this.DateTimeFin.split(" ")[1];
                                this.heureFinConsequences();
                            })
                            .catch((error) => {
                                this.handleResponse(error);
                            });
                    } else console.log("Veuillez entrer une heure de début");
                } else
                    console.log(
                        "Veuillez rentrer une date de début et une durée valide"
                    );
                this.setValidationButtonsVisibility(true);
            })
            .catch((error) => {
                console.log("setCorrectDateDebut error");
                this.handleResponse(error);
            });
    }

    setCorrectDateDebut() {
        let promise;
        if (this.DateDebut != null) {
            // console.log('setCorrectDateDebut with date ' + this.DateDebut)
            promise = returnCorrectCurrentOrNextDate({
                currentDateStr: this.DateDebut,
                bhId: this.RBusinessPlanning
            })
                .then((correctDate) => {
                    // console.log('returned date : ' + correctDate)
                    let dateDeDebut = correctDate.toString().split("/");
                    this.DateDebut =
                        dateDeDebut[2] +
                        "/" +
                        dateDeDebut[1] +
                        "/" +
                        dateDeDebut[0];
                })
                .catch((error) => {
                    console.log("returnCorrectCurrentOrNextDate error");
                    this.handleResponse(error);
                });
        } else promise = Promise.resolve();
        return promise;
    }

    DateFin = null;
    updateDateFin(event) {
        this.DateFin = event.target.value;
        this.dateFinConsequences();
    }

    dateFinConsequences() {}

    HoraireDateFin = null;
    updateHoraireDateFin(event) {
        this.HoraireDateFin = event.target.value;

        console.log('KIL2022 this.Astreinte : '+this.Astreinte);
       
        if(this.Astreinte===false){        

            this.horaireDateFinConsequences();

        }
        
        
    }

    async horaireDateFinConsequences() {
        await this.setCorrectHoraireDateDebutEtFin();
        await this.calculateDuree();
        await this.setValidationButtonsVisibility(true);
    }

    HoraireHeureFin = "18:00:00";
    updateHoraireHeureFin(event) {
        this.HoraireHeureFin = event.target.value.replace("h", ":");

        console.log('KIL2022 this.Astreinte : '+this.Astreinte);
         
        

        if(this.Astreinte===false){        

            this.horaireHeureFinConsequences();

        }
     
     
    }

    async horaireHeureFinConsequences() {
        await this.setCorrectHoraireDateDebutEtFin();
        await this.calculateDuree();
        await this.setValidationButtonsVisibility(true);
    }

    HeureFin = null;
    updateHeureFin(event) {
        this.HeureFin = event.target.value;
        this.heureFinConsequences();
    }

    heureFinConsequences() {
        if (this.HoraireDuree > this.affaireDayLeft && this.HoraireDuree !== 0)
            this.dureeJourOverflowErrorMessage =
                "Attention, la durée saisie dépasse le nombre de jours restants sur l'affaire sélectionnée.";
                
        else this.dureeJourOverflowErrorMessage = "";

        this.setdureeJourOverflowErrorMessage();
    }

    

    async calculateDuree() {
        if (this.saisieHoraire === false || this.Astreinte === true) return;
        if (
            this.HoraireDateDebut != null &&
            this.HoraireHeureDebut != null &&
            this.HoraireDateFin != null &&
            this.HoraireHeureFin != null
        ) {
            let parameters = {
                startDateStr: this.HoraireDateDebut,
                startTimeStr: this.HoraireHeureDebut,
                endDateStr: this.HoraireDateFin,
                endTimeStr: this.HoraireHeureFin,
                bhId: this.RBusinessPlanning
            };
            // console.log('Saisie horaire :')
            // console.log('Date de début : ' + this.HoraireDateDebut)
            // console.log('Heure de début : ' + this.HoraireHeureDebut)
            // console.log('Date de fin : ' + this.HoraireDateFin)
            // console.log('Heure de fin : ' + this.HoraireHeureFin)
            apexCalculateBusinessHours(parameters)
                .then((results) => {
                    let DTDebut = results[0];
                    let DTFin = results[1];
                    let DTDureeHour = results[2];
                    let DTDureeMinu = results[3];

                    /*this.HoraireDateDebut = results[4];
                    this.HoraireHeureDebut = results[5];
                    this.HoraireDateFin = results[6];
                    this.HoraireHeureFin = results[7];*/

                    this.DateTimeDebut = DTDebut;
                    this.DateTimeFin = DTFin;
                    this.HoraireDuree = DTDureeHour +' H '+ DTDureeMinu +' minutes';
                    
                    this.Duree= parseInt(DTDureeHour) +(parseFloat(DTDureeMinu/60));
                    
                    // console.log('results :')
                    // console.log('DateTimeDebut : ' + this.DateTimeDebut)
                    // console.log('DateTimeFin : ' + this.DateTimeFin)
                    // console.log('HoraireDuree : ' + this.HoraireDuree)

                    if (
                        this.HoraireDuree > this.affaireDayLeft &&
                        this.HoraireDuree !== 0
                    )
                        this.dureeJourOverflowErrorMessage ="Attention, la durée saisie dépasse le nombre d'heures restantes sur l'affaire sélectionnée.";
                        //this.dureeJourOverflowErrorMessage = "";
                    else this.dureeJourOverflowErrorMessage = "";

                    // console.log("this.RessourceMId:", this.RessourceMId);
                    // console.log("this.RessourceHId:", this.RessourceHId);
                    // console.log("this.DateTimeDebut:", this.DateTimeDebut);
                    // console.log("this.DateTimeFin:", this.DateTimeFin);
                    if (
                        this.RessourceMId !== null &&
                        this.RessourceHId === null
                    ) {
                        // Si on est sur une ressource matérielle, vérifier que la ressource n'a pas déjà une affectation ce jour ci
                        parameters = {
                            ressourceId: this.RessourceMId,
                            SObjectType: "RessourceMaterielle__c",
                            startDateTimestr: this.DateTimeDebut,
                            endDateTimeStr: this.DateTimeFin
                        };

                        // console.log("parameters:", parameters);

                        checkIfAffectationisOverAnotherAffectationForTheRessource(
                            parameters
                        ).then((result) => {
                            // console.log("result:", result);
                            [
                                this.isOverAnotherAffectation,
                                this.messageIsOverAnotherAffectation
                            ] = result;
                            if (this.isOverAnotherAffectation === "true")
                                this.userHasAlreadySeenTheMessage = false;
                        });
                    }

                    this.setdureeJourOverflowErrorMessage();
                })
                /*.catch((error) => {
                    console.log(
                        "Erreur dans apexCalculateBusinessHours : ",
                        JSON.stringify(error)
                    );
                    this.handleResponse(error);
                });*/
        }

        if (this.Astreinte === true) {
            if (
                this.HoraireDuree > this.affaireDayLeft &&
                this.HoraireDuree !== 0
            )
                this.dureeJourOverflowErrorMessage =
                    "Attention, la durée saisie dépasse le nombre d'heures restantes sur l'affaire sélectionnée.";
                    
            else this.dureeJourOverflowErrorMessage = "";

            this.setdureeJourOverflowErrorMessage();
        }
    }

    setCorrectHoraireDateDebut() {
        let promise;
        if (this.HoraireDateDebut != null && this.HoraireHeureDebut != null) {
            // console.log('setCorrectHoraireDateDebut with date ' + this.HoraireDateDebut + ' and time ' + this.HoraireHeureDebut)
            promise = returnCorrectCurrentOrNextDateTime({
                currentDateStr: this.HoraireDateDebut,
                currentTimeStr: this.HoraireHeureDebut,
                bhId: this.RBusinessPlanning
            })
                .then((correctDateTime) => {
                    // console.log('returned date : ' + correctDateTime)

                    let HoraireDateDeDebut = correctDateTime
                        .split(" ")[0]
                        .split("/");

                    this.HoraireDateDebut =
                        HoraireDateDeDebut[2] +
                        "-" +
                        HoraireDateDeDebut[1] +
                        "-" +
                        HoraireDateDeDebut[0];
                    this.HoraireHeureDebut =
                        correctDateTime.split(" ")[1] + ":00.000";
                    console.log('this.HoraireHeureDebut:', this.HoraireHeureDebut);
                })
                .catch((error) => {
                    console.log("returnCorrectCurrentOrNextDateTime error");
                    this.handleResponse(error);
                });
        } else promise = Promise.resolve();
        return promise;
    }

    setCorrectHoraireDateFin() {
        let promise;
        if (this.HoraireDateFin != null && this.HoraireHeureFin != null) {
            // console.log('setCorrectHoraireDateFin with date ' + this.HoraireDateFin + ' and time ' + this.HoraireHeureFin)
            promise = returnCorrectCurrentOrNextDateTime({
                currentDateStr: this.HoraireDateFin,
                currentTimeStr: this.HoraireHeureFin,
                bhId: this.RBusinessPlanning
            })
                .then((correctDateTime) => {
                    // console.log('returned date : ' + correctDateTime)

                    let HoraireDateDeFin = correctDateTime
                        .split(" ")[0]
                        .split("/");

                       
                    this.HoraireDateFin =
                        HoraireDateDeFin[2] +
                        "-" +
                        HoraireDateDeFin[1] +
                        "-" +
                        HoraireDateDeFin[0];
                    this.HoraireHeureFin =
                        correctDateTime.split(" ")[1] + ":00.000";
                    if(this.HoraireHeureFin== "14:00:00.000"){
                        this.HoraireHeureFin="13:00:00.000";
                        }
                        console.log('this.HoraireHeureFin:', this.HoraireHeureFin);
                })
                .catch((error) => {
                    console.log("returnCorrectCurrentOrNextDateTime error");
                    this.handleResponse(error);
                });
        } else promise = Promise.resolve();
        return promise;
    }

    async setCorrectHoraireDateDebutEtFin() {
        this.setCorrectHoraireDateDebut().then(this.setCorrectHoraireDateFin());
    }

    Lieu;
    DefaultLieu;
    lieuOptions = [];
    async setLieuOptions() {
        await getLieuGlobalPicklist()
            .then((results, error) => {
                if (results) {
                    results = JSON.parse(results);
                    let lieux = [];
                    results.forEach((value) => {
                        if (value.active) {
                            lieux.push({
                                value: value.value,
                                label: value.label
                            });
                            if (value.defaultValue)
                                this.DefaultLieu = value.value;
                        }
                    });
                    this.lieuOptions = lieux;
                } else if (error)
                    console.log("getLieuGlobalPicklist error", error);
            })
            .catch((error) => {
                console.log("getLieuGlobalPicklist error");
                this.handleResponse(error);
            });
    }

    updateLieu(event) {
        this.Lieu = event.target.value;
        this.setValidationButtonsVisibility(true);
    }

    lieuConsequences() {
        this.setValidationButtonsVisibility(true);
    }

    showFacturation = true;
    BonDeLivraison = 'Oui';
    bLOptions = [

        {
            value: "Oui",
            label: "Oui"
            
        },
        {
            value: "Non",
            label: "Non"
        }
    ];
    updateBonDeLivraison(event) {
        this.BonDeLivraison = event.target.value;
        this.bonDeLivraisonConsequences();
    }

    bonDeLivraisonConsequences() {
         
        let devise = this.template.querySelector(
            "lightning-combobox[data-id=Devise"
        );
        let prix = this.template.querySelector(
            "lightning-input[data-id=PrixUnitaire"
        );
        if (this.BonDeLivraison === "Non") {
            // Bloque la selection de la devise
            //devise.value = "";
            //this.Devise = "";
            //this.deviseConsequences();
            // devise.disabled = true

            // Passe le prix à 0 et on le bloque
            prix.value = 0;
            this.Prix = 0;
            this.prixConsequences();
            this.IsPrixReadOnly = true;
        } else {
            // Débloque la selection de la devise
            // devise.removeAttribute('disabled')


            // Débloque le prix
            this.IsPrixReadOnly = false;
        }
        this.setValidationButtonsVisibility(true);
    }

    Prix;
    IsPrixReadOnly = true;
    updatePrix(event) {
        this.Prix = event.target.value;
        this.prixConsequences();
    }

    prixConsequences() {
        this.setValidationButtonsVisibility(true);
    }

    async getPriceFromLigneAffaireId(ligneAffaireId) {
        let parameter = {
            ligneAffaireId: ligneAffaireId
        };
        getPriceFromLigneAffaireId(parameter)
            .then((results) => {
                this.Prix = results.PrixDeLaJournee__c;
                this.prixConsequences();
                this.template.querySelector(
                    "lightning-input[data-id=PrixUnitaire]"
                ).value = this.Prix;
                this.Devise = results.CurrencyIsoCode;
                //this.deviseConsequences();
            })
            .catch((error) => {
                console.log("getPriceFromAffaireId lookup error");
                this.handleResponse(error);
            });
    }

    async getFacturationOptionFromLigneAffaireId(ligneAffaireId) {
        let parameter = {
            ligneAffaireId: ligneAffaireId
        };
        getFacturationOptionFromLigneAffaireId(parameter)
            .then((results) => {
                if (results.Facturable__c === true)
                    this.BonDeLivraison = "Oui";
                else if (results.Facturable__c === false)
                    this.BonDeLivraison = "Oui";
                this.bonDeLivraisonConsequences();
            })
            .catch((error) => {
                console.log("getPriceFromAffaireId lookup error");
                this.handleResponse(error);
            });
    }

    Devise;
    deviseOptions = [
        {
            value: "EUR",
            label: "EUR"
        },
        {
            value: "CHF",
            label: "CHF"
        }
    ];
    updateDevise(event) {
        this.Devise = event.target.value;
        this.deviseConsequences();
    }

    deviseConsequences() {
        this.setValidationButtonsVisibility(true);
    }

    Libelle;
    hasLibelleFactureBeenManuallyEdited = false;
    updateLibelle(event) {
        this.hasLibelleFactureBeenManuallyEdited = true;
        this.Libelle = event.target.value;
        this.libelleConsequences();
    }

    libelleConsequences() {
        this.setValidationButtonsVisibility(true);
    }

    cancelCreation() {
        this.sendCustomClosingEvent();
        this.resetEveryFields();
    }
    submitCreationAndClose() {
        this.submitRecord()
            .then((result) => {
                this.handleResponse(result);
                if (this.Duree > this.affaireDayLeft && this.Duree !== 0){

                    alert("Attention, la durée saisie dépasse le nombre de jours restants sur l'affaire sélectionnée.");

                }
                if (result[0] === "success") {
                    this.sendCustomClosingEvent();
                    this.resetEveryFields();
                }
            })
            .catch((error) => {
                console.log("submitCreationAndClose : submitRecord error");
                this.handleResponse(error);
            });
    }
    async submitCreationAndGoToRecord() {
        this.submitRecord()
            .then(async (result) => {
                this.handleResponse(result);
                // console.log("result:", result);
                if (this.Duree > this.affaireDayLeft && this.Duree !== 0){

                    alert("Attention, la durée saisie dépasse le nombre de jours restants sur l'affaire sélectionnée.");

                }

                

                if (result[0] === "success") {
                    
                    //this.sendCustomClosingEventAndGoToUrl();
                    window.location = this.recordUrl;
                    //location.reload();
                    
                }
                
            })
            .catch((error) => {
                console.log(
                    "submitCreationAndGoToRecord : submitRecord error"
                );
                this.handleResponse(error);
            });
    }

    checkValidity() {
      

        if (
            (this.RessourceHId || this.RessourceMId) &&
            this.TiersID &&
            this.AffaireID &&
            // Si la ligne de facturation n'est pas remplie, ce n'est pas grave si c'est une ressource matérielle
            (this.LigneAffaireId || this.RessourceMId) &&
            this.Titre &&
            this.Couleur &&
            !this.isSubmissionProcessing &&
            // Si on est en saisie horaire (facturation en heure), on vérifie que la date/heure de début et date/heure de fin soit remplie et la duree calculée. Pas besoin de prendre en compte l'astreinte car la durée doit toujours être remplie.
            ((this.saisieHoraire &&
                this.HoraireDateDebut &&
                this.HoraireHeureDebut &&
                this.HoraireDateFin &&
                this.HoraireHeureFin &&
                this.HoraireDuree) ||
                // Si on est en saisie duree (facturation en jours), on vérifie que la date et la durée soit remplie et si la durée est un décimal, que l'horaire soit rempli
                (!this.saisieHoraire &&
                    this.DateDebut &&
                    this.Duree &&
                    (this.isDureeAnInteger || this.HeureDebut))) &&
            this.Lieu &&
            // On valide que si il n'y a pas de bon de livraison où si le bon de livraison est rempli
            (this.BonDeLivraison === "Non" ||
                (this.Prix != null && this.Devise && this.Libelle))
        ) {
            // console.log('c\'est bon !')
            this.setValidationButtonsVisibility(true);
        } else {
            // console.log('c\'est pas bon.')
            this.setValidationButtonsVisibility(true);
        }
    }

    setValidationButtonsVisibility(value) {
        let quitButton = this.template.querySelector(
            "lightning-button[data-id=saveAndQuitButton]"
        );
        let goToRecordButton = this.template.querySelector(
            "lightning-button[data-id=saveAndGoButton]"
        );
        if (quitButton) quitButton.disabled = !value;
        if (goToRecordButton) goToRecordButton.disabled = !value;
    }

    isSubmissionProcessing = false;
    async submitRecord() {
        // Warn the user if the horaire is over another affectation (if the ressource is a material one)
        if (
            this.isOverAnotherAffectation === "true" &&
            this.userHasAlreadySeenTheMessage === false
        ) {
            //   alert(this.messageIsOverAnotherAffectation);
            this.userHasAlreadySeenTheMessage = true;
            return [
                "warning",
                this.messageIsOverAnotherAffectation,
                "{0}",
                [
                    {
                        url: `/${this.RessourceMId}`,
                        label: "Vous pouvez consulter le planning de cette ressource matérielle en cliquant sur cette phrase !"
                    }
                ]
            ];
        }

        this.isSubmissionProcessing = true;
        this.setValidationButtonsVisibility(true);

        let status;
        let title;
        let message;
        let returnValue;

        let fieldsValue = {
            // Combinaison {apiName : value}
            Tiers__c: this.TiersID,
            Affaire__c: this.AffaireID,
            Tache__c: this.LigneAffaireId,

            Titre__c: this.Titre,
            CodeCouleur__c: this.Couleur,
            Description__c: this.Description,
            Astreinte__c: this.Astreinte,
            Lieu__c: this.Lieu,
            PartEnBL__c: this.BonDeLivraison,
            PrixaLaJournee__c: this.Prix,
            LibelleDeFacturation__c: this.Libelle,
            Previsionnel__c: this.Previsionnel,
            CurrencyIsoCode : this.Devise
            //recordTypeId: this.RecordTypeId
        };

        let parameters = {};

        if (this.RessourceHId)
            fieldsValue.RessourceHumaine__c = this.RessourceHId;
        else if (this.RessourceMId)
            fieldsValue.RessourceMaterielle__c = this.RessourceMId;

        if (this.saisieHoraire === true) {
            fieldsValue.NombreJours__c = this.HoraireDuree;//this.Duree;

            parameters = {
                DateDebut: this.HoraireDateDebut,
                HeureDebut: this.HoraireHeureDebut,
                DateFin: this.HoraireDateFin,
                HeureFin: this.HoraireHeureFin
            };
        } else {
            fieldsValue.NombreJours__c = this.Duree;

            parameters = {
                DateDebut: this.DateDebut,
                HeureDebut: this.HeureDebut,
                DateFin: this.DateFin,
                HeureFin: this.HeureFin
            };
        }
        await setDateTimesFromDateAndTime(parameters)
            .then(async (results) => {
                fieldsValue.DateDeDebut__c = results[0];
                fieldsValue.DateDeFin__c = results[1];
                let recordInput = {};

                if (this.editMode === true) {
                    fieldsValue.Id = this.recordId;
                    fieldsValue.RecordTypeId = this.RecordTypeId;
                    recordInput = {
                        fields: fieldsValue
                    };

                    // console.log('Before updateRecord, recordInput: ')
                    // console.log(recordInput)
                    await updateRecord(recordInput)
                        .then(async () => {
                            // console.log('updateRecord then')
                            status = "success";
                            title = "Succès !";
                            message =
                                "L'affectation a été mise à jour avec succès. Cliquez {0} pour y accéder !";
                            returnValue = [
                                status,
                                title,
                                message,
                                [
                                    {
                                        url: this.recordUrl,
                                        label: "ici"
                                    }
                                ]
                            ];
                        })
                        .catch((error) => {
                            console.log("updateRecord crash");
                            this.handleResponse(error);
                            returnValue = error;
                        });
                } else {
                    recordInput = {
                        apiName: "Affectation__c",
                        fields: fieldsValue
                    };
                    // console.log('création')
                    // console.log('recordInput:', recordInput)
                    await createRecord(recordInput)
                        .then(async (record) => {
                            // console.log('success')

                            status = "success";
                            title = "Succès !";
                            message =
                                "L'affectation a été crée avec succès. Cliquez {0} pour y accéder !";

                            this.createdAffectationId = record.id;
                            returnValue = [
                                status,
                                title,
                                message,
                                [
                                    {
                                        url: this.recordUrl,
                                        label: "ici"
                                    }
                                ]
                            ];
                        })
                        .catch((error) => {
                            console.log("createRecord error :");
                            this.handleResponse(error);
                            returnValue = error;
                        });
                }
                return returnValue;
            })
            .catch((error) => {
                console.log("setDateTimesFromDateAndTime error :");
                this.handleResponse(error);
                returnValue = error;
            });
        this.isSubmissionProcessing = false;
        this.setValidationButtonsVisibility(true);
        return returnValue;
    }

    handleTiersSearch(event) {
        let parameters = event.detail; // { searchTerm: String, selectedIds: [ String ] }
        apexSearchAccounts(parameters)// voir LookupController.cls
            .then((results) => {
                this.template
                    .querySelector("c-lookup[data-id=tiersSearch]")
                    .setSearchResults(results);
            })
            .catch((error) => {
                /*console.log("apexSearchAccounts error");
                this.handleResponse(error);*/
            });
    }

    handleAffairesSearch(event) {
        let parameters = event.detail; // { searchTerm: String, selectedIds: [ String ] }
        parameters.IdTiers = this.TiersID;
        apexSearchAffaires(parameters)
            .then((results) => {
                this.template
                    .querySelector("c-lookup[data-id=affairesSearch")
                    .setSearchResults(results);
            })
            .catch((error) => {
                console.log("handleAffairesSearch lookup error");
                this.handleResponse(error);
            });
    }

    handleLigneAffairesSearch(event) {
        let parameters = event.detail; // { searchTerm: String, selectedIds: [ String ] }
        parameters.IdAffaire = this.AffaireID;
        apexSearchLigneAffaires(parameters)
            .then((results) => {
                this.template
                    .querySelector("c-lookup[data-id=ligneAffairesSearch")
                    .setSearchResults(results);
            })
            .catch((error) => {
                console.log("handleLigneAffairesSearch lookup error");
                this.handleResponse(error);
            });
    }

    handleRessourceSearch(event) {
        // console.log("handleRessourceSearch");
        let parameters = event.detail; // { searchTerm: String, selectedIds: [ String ] }
        parameters.filterOnActive = this.filterOnActive;
        apexSearchRessource(parameters) // voir LookupController.cls
            .then((results) => {
                this.template
                    .querySelector("c-lookup[data-id=ressourceSearch]")
                    .setSearchResults(results);
                this.getBusinessPlanningFromRessourceHId(results.id);
                    
            })
            .catch((error) => {
                console.log("handleRessourceSearch lookup error");
                this.handleResponse(error);
            });
    }

    sendCustomClosingEvent() {
        const closingEvent = new CustomEvent("closingcreationmodal");
        this.dispatchEvent(closingEvent);
    }

    sendCustomClosingEventAndGoToUrl() {
        const closingAndUrlEvent = new CustomEvent(
            "closingcreationmodalandgotourl",
            {
                detail: {
                    url: this.recordUrl
                }
            }
        );
        this.dispatchEvent(closingAndUrlEvent);
    }

    switchSaisieButtonLabel = "Saisie : horaires";
    saisieHoraire = true;
    switchInputMode() {
        if (this.saisieHoraire === true) {
            this.saisieHoraire = false;
            this.switchSaisieButtonLabel = "Saisie : jours";
        } else {
            this.saisieHoraire = true;
            this.switchSaisieButtonLabel = "Saisie : horaires";
        }
    }

    async setDefaultValues(value) {
        // console.log("setDefaultValues()");
        getFieldsFromObjecstWithoutId({
            ObjectAPIName: "Business_Time__mdt",
            fieldsName: [
                "Par_D_faut__c, BusinessTimeStep__c, Minutes_Per_Hour__c, Hours_Per_Day__c, Number_of_Days__c"
            ]
        })
            .then((Business_Time) => {
                for (let b of Business_Time) {
                    console.log('business time :', b)

                    // Tout le monde a les mêmes BusinessTime
                    if (b.Par_D_faut__c === true) this.businessTime = b;
                }
                this.stepDuree = this.businessTime.BusinessTimeStep__c;
                this.labelDuree = "Durée (multiple de " + this.stepDuree + " )";
                if (this.saisieHoraire === false)
                    this.template.querySelector(
                        "lightning-input[data-id=JourDuree]"
                    ).label = this.labelDuree;
            })
            .catch((error) => {
                console.log("getFieldsFromObjecstWithoutId error");
                this.handleResponse(error);
            });

        await this.setLieuOptions();

        // console.log('Data from AffectationCalendar : ')
        // console.log(value)
        this.setDefaultRessourceResults();
        await this.setDefaultClassificationValues(value)
            .then(() => {
                // console.log("Default Ressource H: " + this.RessourceHId)
                // console.log("Default Tiers id : " + this.TiersID)
                // console.log("Default Affaire id : " + this.AffaireID)
                // console.log("Default Ligne Affaire id : " + this.LigneAffaireId)
                this.setDefaultTiersResults();
                this.setDefaultAffaireResults();
                this.setDefaultLigneAffaireResults();
            })
            .catch((error) => {
                console.log("setDefaultClassificationValues error : ");
                this.handleResponse(error);
            });
    }

    async setDefaultClassificationValues(value) {
        console.log("setDefaultClassificationValues value :", JSON.stringify(value));
        this.recordId = value[0];
        this.SObjectName = value[1];
        this.previsionnelColor = value[2];
        let parameters = {
            idRecord: this.recordId,
            SObjectName: this.SObjectName,
            filterOnActive: this.filterOnActive
        };
        console.log('YGT parameters :'+JSON.stringify(parameters));
        if (this.recordId) {
            switch (value[1]) {
                case "RessourceHumaine__c":
                    this.setRessource(parameters);
                    break;
                case "RessourceHumaine__c":
                        this.setRessource(parameters);
                        break;    
                case "RessourceMaterielle__c":
                    this.setRessource(parameters);
                    break;
                case "RessourceMaterielle__c":
                    this.setRessource(parameters);
                    break;
                case "Account":
                    this.setRessource(parameters)
                        .then(this.setTiers(parameters))
                        .catch((error) => {
                            console.log("setRessource error");
                            this.handleResponse(error);
                        });
                    break;
                case "Affaire__c":
                    this.setRessource(parameters)
                        .then(this.setTiers(parameters))
                        .then(this.setAffaire(parameters))
                        .catch((error) => {
                            console.log("setRessource error");
                            this.handleResponse(error);
                        });
                    break;
                case "Affaire__c":
                    this.setRessource(parameters)
                        .then(this.setTiers(parameters))
                        .then(this.setAffaire(parameters))
                        .catch((error) => {
                            console.log("setRessource error");
                            this.handleResponse(error);
                        });
                    break;
                case "LigneDeLAffaire__c":
                    this.setRessource(parameters)
                        .then(this.setTiers(parameters))
                        .then(this.setAffaire(parameters))
                        .then(this.setLigneAffaire(parameters))
                        .catch((error) => {
                            console.log("setRessource error");
                            this.handleResponse(error);
                        });
                    break;
                case "LigneDeLAffaire__c":
                    this.setRessource(parameters)
                        .then(this.setTiers(parameters))
                        .then(this.setAffaire(parameters))
                        .then(this.setLigneAffaire(parameters))
                        .catch((error) => {
                            console.log("setRessource error");
                            this.handleResponse(error);
                        });
                    break;
                case "Affectation__c":
                    this.editMode = true;
                    this.createdAffectationId = parameters[0];
                    this.changeEveryLabels();
                    await this.setEveryValues(parameters);
                    break;
                default:
                    break;
            }
            console.log("setDefaultClassificationValues recordId exists");
        } else this.setRessource(parameters); // Pas de record, donc on ne populate que la ressource (celle du user)
    }

    async setRessource(parameters) {
        console.log("setRessource");
        createSearchResultRessourceFromHostRecord(parameters)
            .then((ressourceSelection) => {
                console.log("ressourceSelection:", ressourceSelection);
                if (ressourceSelection) {
                    this.template.querySelector(
                        "c-lookup[data-id=ressourceSearch]"
                    ).selection = ressourceSelection;
                    // console.log("ressourceSelection:", ressourceSelection);
                    if (
                        ressourceSelection.sObjectType === "RessourceMaterielle__c"
                        || ressourceSelection.sObjectType === "RessourceMaterielle__c"
                    ) {
                        this.RessourceMId = ressourceSelection.id;
                        this.RessourceHId = null;
                        this.ressourceMConsequence();
                    } else if (
                        ressourceSelection.sObjectType === "RessourceHumaine__c"
                        || ressourceSelection.sObjectType === "RessourceHumaine__c"
                    ) {
                        this.RessourceHId = ressourceSelection.id;
                        this.RessourceMId = null;
                        this.ressourceHConsequence();
                    }
                } else
                    console.log(
                        "Ressource impossible à retrouver (setRessource)"
                    );
            })
            .catch((error) => {
                console.log(
                    "createSearchResultRessourceFromHostRecord error"
                );
                this.handleResponse(error);
            });
    }

    async setTiers(parameters) {
        createSearchResultTiersFromHostRecord(parameters)
            .then((tiersSelection) => {
                if (tiersSelection) {
                    this.template.querySelector(
                        "c-lookup[data-id=tiersSearch"
                    ).selection = tiersSelection;
                    this.TiersID = tiersSelection.id;
                    this.tiersConsequences();
                } else console.log("Tiers impossible à retrouver (setTiers)");
            })
            .catch((error) => {
                console.log("createSearchResultTiersFromHostRecord error");
                this.handleResponse(error);
            });
    }

    async setAffaire(parameters) {
        createSearchResultAffaireFromHostRecord(parameters)
            .then((affaireResult) => {
                if (affaireResult) {
                    this.template.querySelector(
                        "c-lookup[data-id=affairesSearch"
                    ).selection = affaireResult;
                    this.AffaireID = affaireResult.id;
                    this.affaireConsequences();
                } else
                    console.log(
                        "Affaire impossible à retrouver (setAffaire)"
                    );
            })
            .catch((error) => {
                console.log("createSearchResultAffaireFromHostRecord error");
                this.handleResponse(error);
            });
    }

    async setLigneAffaire(parameters) {
        createSearchResultLigneAffaireFromHostRecord(parameters)
            .then((ligneAffaire) => {
                if (ligneAffaire) {
                    // console.log('createSearchResultLigneAffaireFromHostRecord results')
                    // console.log('ligneAffaire:', ligneAffaire)
                    this.template.querySelector(
                        "c-lookup[data-id=ligneAffairesSearch"
                    ).selection = ligneAffaire;
                    this.Titre = ligneAffaire.title;
                    this.titreConsequences();
                    this.LigneAffaireId = ligneAffaire.id;
                    this.ligneAffaireConsequences();
                } else
                    console.log(
                        "Ligne d'affaire impossible à retrouver (setLigneAffaire)"
                    );
            })
            .catch((error) => {
                console.log(
                    "createSearchResultLigneAffaireFromHostRecord error"
                );
                this.handleResponse(error);
            });
    }

    async setEveryValues(parameters) {
        getSimpleAffectationDataFromHostRecord(parameters)
            .then(async (value) => {
                this.showFacturation = true;
                this.Name = value.Name;
                this.RecordTypeId = value.RecordTypeId;
                this.Astreinte = value.Astreinte__c;
                this.createdAffectationId = value.Id;
                console.log('setEveryValues +Astreinte en edit :', this.Astreinte); 
                this.Previsionnel = value.Previsionnel__c;
                this.Description = value.Description__c;
                this.Titre = value.Titre__c;
                this.Couleur = value.CodeCouleur__c;
                this.Devise = value.CurrencyIsoCode;
                this.Libelle = value.LibelleDeFacturation__c;
                this.Lieu = value.Lieu__c;
                this.BonDeLivraison = value.PartEnBL__c;
                this.Prix = value.PrixaLaJournee__c;
                let startDate = value.DateDeDebut__c.split(" ")[0];
                startDate =
                    startDate.split("/")[2] +
                    "/" +
                    startDate.split("/")[1] +
                    "/" +
                    startDate.split("/")[0];
                let startTime = value.DateDeDebut__c.split(" ")[1];
                let endDate = value.DateDeFin__c.split(" ")[0];
                endDate =
                    endDate.split("/")[2] +
                    "/" +
                    endDate.split("/")[1] +
                    "/" +
                    endDate.split("/")[0];
                let endTime = value.DateDeFin__c.split(" ")[1];

                let idRessource;
                let idSObjectName;

                if (value.RessourceHumaine__c) {
                    this.RessourceHId = value.RessourceHumaine__c;
                    idRessource = this.RessourceHId;
                    idSObjectName = "RessourceHumaine__c";
                    await this.ressourceHConsequence();
                } else if (value.RessourceMaterielle__c) {
                    this.RessourceMId = value.RessourceMaterielle__c;
                    idRessource = this.RessourceMId;
                    idSObjectName = "RessourceMaterielle__c";
                    await this.ressourceMConsequence();
                }

                await createSearchResultRessourceFromHostRecord({
                    idRecord: idRessource,
                    SObjectName: idSObjectName
                })
                    .then((selection) => {
                        this.ressourceSelection = selection;
                        // console.log('this.RessourceHId:', this.RessourceHId)
                        // console.log('this.ressourceSelection:', this.ressourceSelection)
                        this.heureDebutOptions();
                    })
                    .catch((error) => {
                        console.log(
                            "createSearchResultRessourceFromHostRecord error"
                        );
                        this.handleResponse(error);
                    });
                this.TiersID = value.Tiers__c;
                await createSearchResultTiersFromHostRecord({
                    idRecord: value.Tiers__c,
                    SObjectName: "Account"
                })
                    .then((selection) => {
                        this.tiersSelection = selection;
                        // console.log('this.TiersID:', this.TiersID)
                        // console.log('this.tiersSelection:', this.tiersSelection)
                    })
                    .catch((error) => {
                        console.log(
                            "createSearchResultTiersFromHostRecord error"
                        );
                        this.handleResponse(error);
                    });
                this.AffaireID = value.Affaire__c;
                await createSearchResultAffaireFromHostRecord({
                    idRecord: value.Affaire__c,
                    SObjectName: "Affaire__c"
                })
                    .then((selection) => {
                        this.affaireSelection = selection;
                        // console.log('this.AffaireID:', this.AffaireID)
                        // console.log('this.affaireSelection:', this.affaireSelection)
                    })
                    .catch((error) => {
                        console.log(
                            "createSearchResultAffaireFromHostRecord error"
                        );
                        this.handleResponse(error);
                    });
                this.LigneAffaireId = value.Tache__c;
                await createSearchResultLigneAffaireFromHostRecord({
                    idRecord: value.Tache__c,
                    SObjectName: "LigneDeLAffaire__c"
                })
                    .then((selection) => {
                        this.ligneAffaireSelection = selection;
                        // console.log('this.LigneAffaireId:', this.LigneAffaireId)
                        // console.log('this.ligneAffaireSelection:', this.ligneAffaireSelection)
                    })
                    .catch((error) => {
                        console.log(
                            "createSearchResultLigneAffaireFromHostRecord error"
                        );
                        this.handleResponse(error);
                    });
                getAffaireUniteDeFacturation({
                    AffaireId: this.AffaireID
                })
                    .then(async (results) => {
                        if (results === "Jour" && this.Astreinte == false) {
                            this.saisieHoraire = false;
                            this.DateDebut = startDate;
                            this.HeureDebut = startTime;
                            this.DateFin = endDate;
                            this.HeureFin = endTime;
                            this.Duree = value.NombreJours__c;
                            this.setCorrectDateDebut().then(
                                this.CalculateEndDate()
                            );
                        } else if (results === "Heure") {
                            this.saisieHoraire = true;
                            this.HoraireDateDebut = startDate;
                            this.HoraireHeureDebut = startTime;
                            this.HoraireDateFin = endDate;
                            this.HoraireHeureFin = endTime;
                            this.HoraireDuree = value.NombreJours__c;
                            //this.setCorrectHoraireDateDebutEtFin();
                        }else if (results === "Jour" && this.Astreinte == true) {
                            this.saisieHoraire = true;
                            this.HoraireDateDebut = startDate;
                            this.HoraireHeureDebut = startTime;
                            this.HoraireDateFin = endDate;
                            this.HoraireHeureFin = endTime;
                            this.HoraireDuree =value.NombreJours__c;
                            //this.setCorrectHoraireDateDebutEtFin();
                        }
                        this.setValidationButtonsVisibility(true);
                    })
                    .catch((error) => {
                        console.log(
                            "getAffaireUniteDeFacturation lookup error 4"
                        );
                        this.handleResponse(error);
                    });
            })
            .catch((error) => {
                console.log("getSimpleAffectationDataFromHostRecord error :");
                this.handleResponse(error);
            });
            
    }
    

    title = "Création d'une affectation";
    labelSaveAndGoToRecord = "Enregistrer et aller à l'enregistrement";
    changeEveryLabels() {
        this.title = "Édition d'une affectation";
        this.labelSaveAndGoToRecord = "Mettre à jour l'enregistrement";
    }

    async resetEveryFields() {
        this.ressourceSelection = [];
        this.RessourceHId = null;
        this.RessourceMId = null;
        this.tiersSelection = [];
        this.TiersID = null;
        this.affaireSelection = [];
        this.AffaireID = null;
        this.affaireDayLeft = null;
        this.affaireErrors = [];
        this.ligneAffaireSelection = [];
        this.LigneAffaireId = null;
        this.Titre = null;
        this.Couleur = null;
        this.Description = null;
        this.Astreinte = false;
        this.IsDureeReadOnly = false;
        this.HeureDebut = null;
        this.HoraireDuree = null;
        this.HoraireDureePlaceholder = "Entrez la durée ici...";
        this.isDureeAnInteger = true;
        this.Duree = null;
        this.dureeJourOverflowErrorMessage = null;
        this.DateFin = null;
        this.HoraireDateFin = null;
        this.HoraireHeureFin = null;
        this.HeureFin = null;
        this.DateTimeDebut = null;
        this.DateTimeFin = null;
        this.Lieu = null;
        this.BonDeLivraison = null;
        this.Prix = null;
        this.IsPrixReadOnly = false;
        this.Devise = null;
        this.Libelle = null;
        this.saisieHoraire = true;
        this.title = "Création d'une affectation";
        this.labelSaveAndGoToRecord = "Enregistrer et aller à l'enregistrement";
        this.isOverAnotherAffectation = "false";
        this.messageIsOverAnotherAffectation = "";
        this.userHasAlreadySeenTheMessage = false;
        this.isSubmissionProcessing = false;

        // Après avoir tout rafraichit, on remet les valeurs par défaut
        await this.setDefaultValues(this.originalValue);
    }

    handleResponse(response) {
        console.log("handleResponse has received this :", response);
        console.log(" or ", JSON.stringify(response));
        console.log("type : ", typeof response);
    
        if (response[0] === "success") {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: response[1],
                    message: response[2],
                    variant: "success",
                    messageData: response[3]
                })
            );
        } else {
            let errorMessage = this.extractErrorMessage(response);
    
            console.log("Extracted error message:", errorMessage);
    
            // Vérifier si le message d'erreur est spécifique à "Invalid integer: NaN" ou "Cannot read properties of undefined (reading 'toString')"
            if (errorMessage === "Invalid integer: NaN" || errorMessage ==="Cannot read properties of undefined (reading 'toString')"  || errorMessage === "Attempt to de-reference a null object") {
                errorMessage = "Veuillez remplir les champs durée et Heure de début ";
            }
            console.log("Final error message to display:", errorMessage);
    
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Erreur",
                    message: errorMessage,
                    variant: "error"
                })
            );
    
            if (response[0] !== "error") {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: response[1],
                        message: response[2],
                        variant: response[0]
                    })
                );
            }
        }
    }
    
    extractErrorMessage(response) {
        let errorMessage = "Une erreur est survenue. Veuillez contacter votre administrateur.";
        
        try {
            // Cas où l'erreur se trouve dans response.body.output.errors
            if (response.body && response.body.output && response.body.output.errors && response.body.output.errors.length > 0) {
                errorMessage = response.body.output.errors[0].message || errorMessage;
            }
            // Cas où l'erreur se trouve dans response.body.output.fieldErrors
            else if (response.body && response.body.output && response.body.output.fieldErrors) {
                const fieldErrors = response.body.output.fieldErrors;
                for (let field in fieldErrors) {
                    if (fieldErrors[field] && fieldErrors[field].length > 0) {
                        errorMessage = fieldErrors[field][0].message || errorMessage;
                        break;
                    }
                }
            }
            // Cas où l'erreur se trouve dans response.body.message
            else if (response.body && response.body.message) {
                errorMessage = response.body.message || errorMessage;
            }
            // Cas où l'erreur se trouve directement dans response.message
            else if (response.message) {
                errorMessage = response.message || errorMessage;
            }
        } catch (e) {
            console.error("Error extracting message: ", e);
        }
    
        return errorMessage;
    }
    

   
    
    /* A GARDER FONCTIONNE MAIS TEST MEILLEUR GESTION DES ERREURS
    handleResponse(response) {
        console.log("handleResponse has received this :", response);
        console.log(" or ", JSON.stringify(response));
        console.log("type : ", typeof response);

        let errorMessage = reduceErrors(response);
        errorMessage.forEach((error) => {
            console.log("errorMessage:", error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Une erreur est survenue durant cette opération.",
                    message: response.body.output.errors[0].fielderrors.Affaire__c.message,//"Veuillez contacter votre administrateur.",
                    variant: "error"
                })
            );
        });

        if (response[0] === "success") {
            // console.log("success");
            this.dispatchEvent(
                new ShowToastEvent({
                    title: response[1],
                    message: response[2],
                    variant: "success",
                    messageData: response[3]
                })
            );
        } else if (response[0] !== "error") {
            // console.log(response);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: response[1],
                    message: response[2],
                    variant: response[0]
                })
            );
        }
    }*/
}