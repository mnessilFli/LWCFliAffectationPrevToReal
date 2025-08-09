({
  getRecordDataAndPlanningInit: function (component) {



/* ----------------------------------------------------- */

    let self = this;

    let recordId = component.get("v.mainRecordId");
    // console.log('component.get("v.mainRecordId"):', component.get("v.mainRecordId"))

    let previsionnelColor = component.get("v.previsionnelColor");
    if (recordId == undefined) {
      // On est pas sur une record page
      let SObjectName = component.get("v.sObjectName");
      component.set(
        "v.recordData",
        JSON.stringify([null, SObjectName, previsionnelColor])
      );
      self.buildPlanning(component);
    } else {
      var action = component.get("c.getRecordData");
      action.setParams({
        recordId: component.get("v.mainRecordId"),
        previsionnelColor: previsionnelColor
      });
      action.setCallback(component, function (data) {
        // console.log('getRecordData callback', data.getReturnValue())
        if (data.getState() === "SUCCESS") {
          component.set("v.recordData", JSON.stringify(data.getReturnValue()));
        }
        self.buildPlanning(component);
      });
      $A.enqueueAction(action);
    }
  },

  getBaseurl: function (component) {
    var action2 = component.get("c.getBaseUrl");
    action2.setCallback(component, function (data) {
      // console.log('getBaseUrl callback', data.getReturnValue())
      if (data.getState() === "SUCCESS") {
        // console.log('getBaseurl')
        // console.log('data.getReturnValue():', data.getReturnValue())
        component.set("v.baseUrl", JSON.stringify(data.getReturnValue()));
      }
    });
    $A.enqueueAction(action2);
  },

  upsertEvent: function (component, evObj, callback) {
    // console.log("upsertEvent");
    // console.log("component:", component);
    // console.log("evObj:", evObj);
    var action = component.get("c.upsertEvents");

    let fieldsList = "DateDeDebut__c|DateDeFin__c";
    let fieldsValuesList = `${evObj.startDateTime}|${evObj.endDateTime}`;
    let fieldsTypesList = "dateTime|dateTime";
    action.setParams({
      affId: evObj.Id,
      listFields: fieldsList,
      listFieldsValues: fieldsValuesList,
      listFieldsTypes: fieldsTypesList
    });

    if (callback) {
      action.setCallback(this, callback);
    }
    $A.enqueueAction(action);
  },

  deleteEvent: function (component, event, eventId, callback) {
    var action = component.get("c.deleteEvent");

    action.setParams({
      eventId: eventId,
      sObjectName: component.get("v.sObjectName"),
      titleField: component.get("v.titleField"),
      startDateTimeField: component.get("v.startDateTimeField"),
      endDateTimeField: component.get("v.endDateTimeField"),
      descriptionField: component.get("v.descriptionField"),
      userField: component.get("v.userField")
    });

    if (callback) {
      action.setCallback(this, callback);
    }
    $A.enqueueAction(action);
  },

  openModal: function (component, event) {
    // console.log('openModal')

    let modal = component.find("lwcAffectation"); // remettre 'modal' ici pour avoir de nouveau l'affectation
    let backdrop = component.find("backdrop");

    // Il faut faire ca pour ne pas avoir à cliquer plusieurs fois sur un jour pour que le modal s'ouvre
    $A.getCallback(function () {
      $A.util.addClass(modal, "slds-fade-in-open");
      $A.util.addClass(backdrop, "slds-backdrop--open");
    })();
  },

  getBusinessCalendarForAMonth: function (
    component,
    startDate,
    endDate,
    recordSObjectName,
    recordId
  ) {
    // console.log('getBusinessCalendarForAMonth')

    let action = component.get("c.getWorkedDays");
    action.setParams({
      startDateString: startDate.format("YYYY-MM-DD"),
      endDateString: endDate.format("YYYY-MM-DD"),
      recordSObjectName: recordSObjectName,
      recordId: recordId
    });

    action.setCallback(this, function (data) {
      let j$ = jQuery.noConflict();
      let workedDaysCalendar = component.get("v.workedDaysCalendar");
      let myCalendar =
        workedDaysCalendar == "" ? {} : JSON.parse(workedDaysCalendar);
      let returnCalendar = JSON.parse(data.getReturnValue());
      myCalendar = this.mergeDictionnaries(myCalendar, returnCalendar);
      component.set("v.workedDaysCalendar", JSON.stringify(myCalendar));
      //loop through each non-disabled day cell
      j$(".fc-day:not(.fc-disabled-day)").each(function (index, element) {
        let date = moment(j$(this).data("date"));
        let year = date.format("YYYY");
        let month = date.format("MM");
        let day = date.format("DD");
        if (
          myCalendar[year] != null &&
          myCalendar[year][month] != null &&
          myCalendar[year][month][day] == false
        )
          j$(this).css("background-color", "#EEEEEE");
      });
    });
    $A.getCallback(function () {
      $A.enqueueAction(action);
    })();
  },

  mergeDictionnaries: function (a, b) {
    // console.log("merges (and crushes) b into a");
    for (var key in b) {
      if (a[key] != null) {
        if (a[key].constructor === Object && b[key].constructor === Object) {
          this.mergeDictionnaries(a[key], b[key]);
        } else if (a[key] == b[key]) continue;
        else a[key] = b[key]; // Si il y a un conflit, b écrase a
      } else a[key] = b[key];
    }
    return a;
  },

  getEvents: function (component, startDate, endDate, callback) {
    // console.log('getEvents');
    // console.log('startDate:', startDate)
    // console.log('endDate:', endDate)
    // console.log('recordId', component.get("v.mainRecordId"))
    // console.log('filterByRessourceHumaineField:', component.get("v.filterByRessourceHumaineField"))
    // console.log('filterByAffaireID:', component.get("v.filterByAffaireID"))
    // console.log('filterByLAffaireID:', component.get("v.filterByLAffaireID"))

    var action = component.get("c.getEvents");
    action.setParams({
      startDateStr: startDate,
      endDateStr: endDate,
      sObjectName: component.get("v.sObjectName"),
      recordId: component.get("v.mainRecordId"),
      listFieldsToQuery: component.get("v.listFieldsToQuery"),
      // titleField: component.get("v.titleField"),
      // numeroField: component.get("v.numeroField"),
      startDateTimeField: component.get("v.startDateTimeField"),
      endDateTimeField: component.get("v.endDateTimeField"),
      // durationValueField: component.get("v.durationValueField"),
      // durationUniteField: component.get("v.durationUniteField"),
      // descriptionField: component.get("v.descriptionField"),
      // userField: component.get("v.userField"),
      filterByTiersField: component.get("v.filterByTiersField"),
      tiersField: component.get("v.tiersField"),
      affaireField: component.get("v.affaireField"),
      // affaireNameField: component.get("v.affaireNameField"),
      filterByAffaireID: component.get("v.filterByAffaireID"),
      filterByLAffaireID: component.get("v.filterByLAffaireID"),
      laffaireField: component.get("v.laffaireField"),
      // laffaireNameField: component.get("v.laffaireNameField"),
      filterByRessourceHumaineField: component.get(
        "v.filterByRessourceHumaineField"
      ),
      ressourceHumaineField: component.get("v.ressourceHumaineField"),
      // ressourceHumaineTrigrammeField: component.get(
      //     "v.ressourceHumaineTrigrammeField"
      // ),
      // ressourceHumaineFullNameField: component.get(
      //     "v.ressourceHumaineFullNameField"
      // ),
      // ressourceHumaineRecordTypeField: component.get(
      //     "v.ressourceHumaineRecordTypeField"
      // ),
      filterByRessourceMaterielleField: component.get(
        "v.filterByRessourceMaterielleField"
      ),
      ressourceMaterielleField: component.get("v.ressourceMaterielleField"),
      // ressourceMaterielleNameField: component.get(
      //     "v.ressourceMaterielleNameField"
      // ),
      // ressourceMaterielleRecordTypeField: component.get(
      //     "v.ressourceMaterielleRecordTypeField"
      // ),
      borderfilterFromRessource: component.get("v.borderfilterFromRessource"),
      // eventValidationField: component.get("v.eventValidationField"),
      // eventBackgroundColorField: component.get(
      //     "v.eventBackgroundColorField"
      // ),
      // locationField: component.get("v.locationField"),
      splitEventsOnNonWorkedDays: component.get("v.splitEventsOnNonWorkedDays")
    });

    action.setCallback(this, function (response) {
      // console.log('callback !')

      var state = response.getState();
      if (state === "SUCCESS") {
        let returnValue = response.getReturnValue();

        // console.log('SUCCESS. returnValue:', returnValue)

        let eventList = this.loadEvents(component, returnValue);

        // On copie les valeurs dans deux autres attributs parceque des fois, le calendrier modifie l'attribue 'end' sans raison
        eventList.forEach((evt) => {
          evt["endDateTime"] = evt["end"];
          evt["startDateTime"] = evt["start"];
        });

        console.log("eventList:", eventList);

        callback(eventList);
      } else if (state === "INCOMPLETE") {
        // do something
      } else if (state === "ERROR") {
        var errors = response.getError();
        if (errors) {
          if (errors[0] && errors[0].message) {
            console.error("Error message: " + errors[0].message);
          }
        } else {
          console.error("Unknown error");
        }
      }
    });

    // console.log('Enqueuing Action')
    $A.getCallback(function () {
      $A.enqueueAction(action);
    })();
    // console.log('Action enqueued')
  },

  loadEvents: function (component, returnValue) {
    // console.log('loadEvents');

    let eventsList = [];

    // console.log('component.get("v.recordData"):', component.get("v.recordData"))

    var [recordId, recordSObjectName] = JSON.parse(
      component.get("v.recordData")
    );
    let textBeforeIcons = component.get("v.textBeforeIcons");

    returnValue.forEach((value) => {
      // newEventBorderColor = this.getNewBorderColor(value); // Permet de choisir une couleur de bordure verte si l'affectation a été validée et rouge si non
      let newEventTextColor = this.getNewTextColor(value); // Permet de choisir quelle couleur de texte rajouter pour chaque type de ressource liée à l'affectation
      // console.log('newEventTextColor:', newEventTextColor)
      let newBackGroundColor = this.getNewBackgroundColor(value); // Permet de rajouter l'opacité à la couleur choisie pour faire ressortir le texte
      // console.log('newBackGroundColor:', newBackGroundColor)
      let locationIcon = this.getIcon(value); // Permet d'afficher la bonne icon en fonction du lieu de l'affectation
      console.log('locationIcon:', locationIcon)
      let validationIcon = this.getValidationIcon(value);
      console.log('validationIcon:', validationIcon)
      let newTitle = this.getNewTitle(value, recordSObjectName); // Permet d'afficher le bon titre/sous titre en fonction de l'objet
      // console.log('newTitle:', newTitle)

      let event = {
        id: value.Id,
        title: newTitle,
        numero: value.numero,
        start: moment(value.startDateTime),
        end: moment(value.endDateTime),
        duree: value.duree,
        description: value.description,
        owner: value.owner,
        ressourceHumaine: value.ressourceHumaine,
        ressourceMaterielle: value.ressourceMaterielle,
        laffaireName: value.laffaireName,
        borderFilter: value.borderFilter,
        // borderColor : newEventBorderColor, On ne signifie plus la validation grâce au contour mais avec une icône (voir Title)
        backgroundColor: newBackGroundColor,
        textColor: newEventTextColor,
        icon: validationIcon + locationIcon,
        textBeforeIcons: textBeforeIcons,
        recordSObjectName: recordSObjectName
      };
      eventsList.push(event);
    });
    return eventsList;
  },

  getNewBorderColor: function (value) {
    if (value.eventValidation) {
      return "#007500"; // Vert foncé pour les tâches validées
    } else {
      return "#a30000"; // Rouge foncé pour les tâches non validées
    }
  },

  getValidationIcon: function (value) {
    let size = 20;
    let colorIconBackground;
    let iconAPIName;
    let title;
    let defaultStyle =
      "display:inline-block;border-radius:0.25rem;line-height:1;";
    if (value.eventValidation) {
      iconAPIName = "standard/task2_60.png";
      colorIconBackground =
        "background-color: #4bc076; color: rgb(255, 255, 255);";
      title = "Validé";
    } else {
      colorIconBackground =
        "background-color: #e9696e; color: rgb(255, 255, 255);";
      iconAPIName = "standard/first_non_empty_60.png";
      title = "Non validé";
    }
    return (
      '<img style = "height:' +
      size +
      "px;width:" +
      size +
      "px;" +
      defaultStyle +
      colorIconBackground +
      '" src="' +
      $A.get("$Resource.SLDSStaticResourceWITHOUTIMAGES2Point12Point2") +
      "/icons/" +
      iconAPIName +
      '" alt="' +
      title +
      '">'
    );
  },

  getNewTextColor: function (value) {
    // console.log('getNewTextColor')
    /*
        // Permettait de changer la couleur d'écriture selon la nature de la ressource associée
        let returnValue = "";
        if(value.borderFilter){
            if (!(value.ressourceHumaine.length === 0 && value.ressourceHumaine.constructor === Object)){ //Ressource humaine
                if(value.ressourceHumaine.recordType == "Salarié") // Salarié --> Bleu
                {
                    returnValue = "#0000ff";
                }
                else if (value.ressourceHumaine.recordType == "Externe"){ // Externe --> Vert
                    returnValue = "#00ff00";
                }
                else{ // Si la ressource humaine n'est pas typé --> Gris
                returnValue = "#808080";
                }
            }
            else if (value.ressourceMaterielle){ // Ressource materielle --> noir
                returnValue = "#000000";
            }
            else{ //Aucune ressource --> rouge
                returnValue = "#ff0000";
            }
            //returnValue += '80';  // Enleve de l'opacité aux contours
        }
        else //no filter
        {
            returnValue = "";
        }
        return returnValue;
        */
    return "#000000";
  },

  getNewBackgroundColor: function (value) {
    let defaultOpacity = "80"; // Defaut opacity background color (50%)
    let realColor = value.eventColor + defaultOpacity;
    return realColor;
  },

  getIcon: function (value) {
    let title;
    let styleIconContainer =
      "display:inline-block;border-radius:0.25rem;line-height:1;";
    let styleIcon;
    let iconAPIName;
    let alternativeText;
    let size = "x-small";
    switch (value.location) {
      case "Client":
        iconAPIName = "custom/custom31_60.png";
        title = "Client";
        alternativeText = "Client icon " + size;
        styleIcon = "background-color: #eb687f; color: rgb(255, 255, 255);";
        break;
      case "Bureau":
        iconAPIName = "custom/custom33_60.png";
        title = "Bureau";
        alternativeText = "Office icon " + size;
        styleIcon = "background-color: #97cf5d; color: rgb(255, 255, 255);";
        break;
      case "Domicile":
        iconAPIName = "standard/home_60.png";
        title = "Domicile";
        alternativeText = "Home icon " + size;
        styleIcon = "backgroun-color:#ef7ead";
        break;
      case "Autre":
        iconAPIName = "custom/custom33_60.png";
        title = "Autre";
        alternativeText = "Client icon " + size;
        styleIcon = "background-color: #eb687f; color: rgb(255, 255, 255);";
        break;
      default:
        iconAPIName = "custom/custom33_64.png";
        title = "Lieu non reconnu";
        alternativeText = "Unrecognized location icon " + size;
        styleIcon = "background-color: #eb687f; color: rgb(255, 255, 255);";
    }
    // 2 possibilités
    // Si le framework ligthning est installé
    /*<lightning:icon iconName=[iconAPIName] alternativeText=[alternativeText] title=[title] size=[size]/>*/
    // On aurait donc return '<lightning:icon iconName="' + iconAPIName + '" alternativeText="' + alternativeText + '" title="' + title + '" size="'+ size +'">test</lightning:icon>';

    // Sinon, en référencant les static ressources du framework
    /*
        <span class="slds-icon_container slds-icon-utility-announcement" title="Description of icon when needed">
            <svg class="slds-icon slds-icon-text-default" aria-hidden="true">
                <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#announcement"></use>
            </svg>
            <span class="slds-assistive-text">Description of icon when needed</span>
        </span>
        */

    // On aurait :
    /*
        let returnValue = '<span class="slds-icon_container slds-icon-utility-announcement" title="' + title;
        returnValue += '"><svg class="slds-icon slds-icon-text-default" aria-hidden="true"><use xlink:href="'+$A.get('$Resource.SLDSStaticResourceWITHOUTIMAGES2Point12Point2')+'/icons/'+iconAPIName;
        returnValue += '"></use></svg><span class="slds-assistive-text">'+alternativeText;
        returnValue += '</span></span>';
        */

    return (
      '<img style = "height:20px;width:20px;' +
      styleIconContainer +
      styleIcon +
      '" src="' +
      $A.get("$Resource.SLDSStaticResourceWITHOUTIMAGES2Point12Point2") +
      "/icons/" +
      iconAPIName +
      '" alt="' +
      title +
      '">'
    );
  },

  getNewTitle: function (value, recordSObjectName) {
    console.log("value:", value);
    console.log("recordSObjectName:", recordSObjectName);
    let realTitle = "";
    if (
      // Sur les ressources humaines et matérielles, on affiche l'affaire et non pas le trigramme/le nom
      // Cependant, sur une ressource humaine externe, on affiche le nom de la société
      recordSObjectName == "Account" ||
      recordSObjectName == "Affaire__c" ||
      recordSObjectName == "LigneDeLAffaire__c"
    ) {
      // Afficher le trigramme en titre si ressource humaine ou nom de la ressource matérielle puis le title en sous-titre
      if (value.ressourceHumaine.Id) {
        console.log("ressource humaine");
        // Ressource externe
        if (value.ressourceHumaine.recordType === "Externe")
          realTitle +=
            value.ressourceHumaine.Tiers === undefined
              ? "Externe : tier non reconnu"
              : value.ressourceHumaine.Tiers;
        // Ressource interne
        else
          realTitle +=
            value.ressourceHumaine.Trigramme === undefined
              ? "Pas de Trigramme"
              : value.ressourceHumaine.Trigramme; // Récupérer le trigramme de la ressource
      } else if (value.ressourceMaterielle.Id) {
        console.log("ressource matérielle");
        realTitle += value.ressourceMaterielle.Name;
      }
    } else {
      if (value.recordTypeDevName == "Affectation_classique") {
        // Si on est sur une affectation classique, on marque le nom de l'affaire, si il y en a un
        if (value.affaireName == undefined) realTitle += "Pas de nom d'affaire";
        else realTitle += value.affaireName;
      } else if (value.recordTypeDevName == "Maladie") {
      } else if (value.recordTypeDevName == "Conge") {
      }
    }
    realTitle += "\n " + value.title;
    return realTitle;
  },

  buildPlanning: function (component) {
    // console.log('buildPlanning')

    let j$ = jQuery.noConflict();
    let calendarElement = j$("[id$=calendar]");

    var [recordId, recordSObjectName] = component.get("v.recordData")
      ? JSON.parse(component.get("v.recordData"))
      : [null, null];
    // console.log('recordId:', recordId)
    // console.log('recordSObjectName:', recordSObjectName)

    let self = this;

    // var eventsMap = component.get("v.events");
    j$(document).ready(function () {
      // console.log('ready');

      // var calendarButtons = component.get('v.calendarButtons');
      j$(calendarElement).fullCalendar({
        header: {
          left: "today prev,next",
          center: "title",
          right: "agendaDay,agendaWeek,month,list"
        },
        // Ancien bouton custom
        // customButtons:{
        //     mybutton :{
        //         text:"Affectation interne",
        //         click:function(){
        //             j$(':focus').blur(); // Workaround for a bug you need to click twick in order to make the window appear
        //             this.openInternal(component, event);
        //             j$(':focus').blur();
        //         }
        //     }
        // },
        firstDay: 1, // Le premier jour de la semaine est lundi
        defaultDate: moment().format("YYYY-MM-DD"),
        defaultView: "month",
        navLinks: false, // can't click on the days anymore. Caused it to crash because no behaviour linked
        editable: true,
        eventDurationEditable: false, // Disabled because doens't want to be able to resize (https://fullcalendar.io/docs/v3/editable)
        eventStartEditable: true, // Enable dragging (https://fullcalendar.io/docs/v3/eventStartEditable)
        eventDrop: function (event, delta, revertFunc) {
          //   console.log("eventDrop");

          if (
            !confirm(
              "Êtes vous sûrs de vouloir déplace cet évènement au " +
                event.start.format() +
                "?"
            )
          ) {
            revertFunc();
          } else {
            var evObj = {
              Id: event.id,
              title: event.title,
              startDateTime: moment(event.start._i).add(delta).format(),
              endDateTime: moment(event.end._i).add(delta).format(),
              description: event.description
            };
            self.upsertEvent(component, evObj);
          }
        },
        eventLimit: true, // allow "more" link when too many events
        weekends: component.get("v.weekends"),
        eventBackgroundColor: component.get("v.eventBackgroundColor"),
        eventBorderColor: component.get("v.eventBorderColor"),
        eventTextColor: component.get("v.eventTextColor"),
        timeFormat: "H:mm", // uppercase H for 24-hour clock,
        lazyFetching: false,
        height: 800,
        // Pour l'instant, on a toutes les affectations, mais si on veut plus de sources, on peut les mettre là
        eventSources: [
          {
            events: function (start, end, timezone, callback) {
              // console.log('Fetching new events :')
              // console.log('component:', component)
              // console.log('start:', start)
              // console.log('end:', end)
              // console.log('recordSObjectName:', recordSObjectName)
              // console.log('recordId:', recordId)

              self.getBusinessCalendarForAMonth(
                component,
                start,
                end,
                recordSObjectName,
                recordId
              );
              self.getEvents(component, start, end, callback);
              // Le but est de récupérer en même temps les events et les jours non ouvrés
            }
          }
        ],
        viewRender: function (view, element) {
          // console.log('viewRender')
        },
        eventClick: function (calEvent, jsEvent, view) {
          // console.log('clicked on :');
          // console.log(calEvent);
          var urlEvent = $A.get("e.force:navigateToURL");

          let absoluteUrl = false;
          let url = absoluteUrl
            ? component.get("v.baseUrl") +
              "/lightning/r/Affectation__c/" +
              calEvent.id +
              "/view"
            : "/lightning/r/Affectation__c/" + calEvent.id + "/view";
          // console.log('url:', url)

          urlEvent.setParams({
            url: url
          });
          urlEvent.fire();

          // component.set('v.titleVal', calEvent.title);
          // component.set('v.descriptionVal', calEvent.description);
          // component.set('v.startDateTimeVal', moment(calEvent.start._d).format());
          // component.set('v.endDateTimeVal', moment(calEvent.end._d).format());
          // component.set('v.idVal', calEvent.id);
          // component.set('v.newOrEdit', 'Edit');
          // this.openModal(component, event);
        },
        // eventDrop: function (event, delta, revertFunc) {
        //   var evObj = {
        //     Id: event.id,
        //     title: event.title,
        //     startDateTime: moment(event.start._i).add(delta).format(),
        //     endDateTime: moment(event.end._i).add(delta).format(),
        //     description: event.description
        //   };
        //   self.upsertEvent(component, evObj);
        // },
        // eventResize: function (event, delta, revertFunc) {
        //   var evObj = {
        //     Id: event.id,
        //     title: event.title,
        //     startDateTime: moment(event.start._i).format(),
        //     endDateTime: moment(event.end._i).add(delta).format(),
        //     description: event.description
        //   };
        //   self.upsertEvent(component, evObj);
        // },
        dayClick: function (date, jsEvent, view) {
          // console.log('dayClick');
          if (date._f == "YYYY-MM-DD") {
            component.set(
              "v.startDateTimeVal",
              moment(date.format()).add(12, "hours").format()
            );
            component.set(
              "v.endDateTimeVal",
              moment(date.format()).add(14, "hours").format()
            );
          } else {
            component.set("v.startDateTimeVal", moment(date.format()).format());
            component.set(
              "v.endDateTimeVal",
              moment(date.format()).add(2, "hours").format()
            );
          }
          component.set("v.newOrEdit", "New");
          self.openModal(component, jsEvent);
        },
        // eventRender: function (event, element) {
        //   //   console.log("event render:", event);

        //   let fullString = "";
        //   if (event.numero) fullString += event.numero;
        //   else fullString += "Numéro non reconnu";

        //   if (event.ressourceHumaine.Id) {
        //     if (event.ressourceHumaine.FullName)
        //       fullString +=
        //         "\nRessource humaine: " + event.ressourceHumaine.FullName;
        //     else fullString += "\nNom de la ressource non reconnue";
        //   } else if (event.ressourceMaterielle.Id) {
        //     if (event.ressourceMaterielle.Name)
        //       fullString +=
        //         "\nRessource matérielle: " + event.ressourceMaterielle.Name;
        //     else fullString += "\nNom de la ressource matérielle non reconnue";
        //   }

        //   if (event.laffaireName)
        //     fullString += "\nTache : " + event.laffaireName;
        //   else fullString += "\nTache : Non reconnue";

        //   if (event.startDateTime)
        //     fullString +=
        //       "\nDébut : " + moment(event.startDateTime).format("DD/MM HH:mm");
        //   else fullString += "\nDébut : Date non reconnue";

        //   if (event.endDateTime)
        //     fullString +=
        //       "\nFin : " + moment(event.endDateTime).format("DD/MM HH:mm");
        //   else fullString += "\nFin : Date non reconnue";

        //   if (event.duree.Value) {
        //     fullString += "\nDurée : " + event.duree.Value;
        //     if (event.duree.Unite == "Heure") fullString += "h";
        //     else fullString += "j";
        //   } else fullString += "\nDurée : incomplete ou non reconnue";

        //   element[0].title = fullString;
        // },
        eventRender: function (event, element, view) {
    let fullString = "";

    if (event.numero) fullString += event.numero;
    else fullString += "Numéro non reconnu";

    if (event.ressourceHumaine.Id) {
        if (event.ressourceHumaine.FullName)
            fullString += "\nRessource humaine: " + event.ressourceHumaine.FullName;
        else fullString += "\nNom de la ressource non reconnue";
    } else if (event.ressourceMaterielle.Id) {
        if (event.ressourceMaterielle.Name)
            fullString += "\nRessource matérielle: " + event.ressourceMaterielle.Name;
        else fullString += "\nNom de la ressource matérielle non reconnue";
    }

    if (event.laffaireName)
        fullString += "\nTache : " + event.laffaireName;
    else fullString += "\nTache : Non reconnue";

    if (event.startDateTime)
        fullString += "\nDébut : " + moment(event.startDateTime).format("DD/MM HH:mm");
    else fullString += "\nDébut : Date non reconnue";

    if (event.endDateTime)
        fullString += "\nFin : " + moment(event.endDateTime).format("DD/MM HH:mm");
    else fullString += "\nFin : Date non reconnue";

    if (event.duree.Value) {
        fullString += "\nDurée : " + event.duree.Value;
        if (event.duree.Unite == "Heure") fullString += "h";
        else fullString += "j";
    } else fullString += "\nDurée : incomplete ou non reconnue";

    element[0].title = fullString;

    // Ajout des icônes dynamiques
    if (event.icon) {
        let iconHtml = event.icon; // Supposons que event.icon contient le HTML de l'icône

        // Pour la vue "Semaine"
        if (view.type === 'agendaWeek') {
            element.find('.fc-time span').append(iconHtml);
        }

    }
},

        eventAfterRender: function (event, element, view) {
          // console.log('eventAfterRender');
        },
        eventMouseover: function (event, jsEvent, view) {},
        eventMouseout: function (event, jsEvent, view) {},
        dayRender: function (date, cell) {
          // console.log('day rendering');
        },
        eventAfterAllRender: function (view) {
          // console.log('eventAfterAllRender');
        }
      });
    });
  },
  closeModal: function (component) {
    // console.log('closeModal')

    var modal = component.find("lwcAffectation");
    $A.util.removeClass(modal, "slds-fade-in-open");
    var backdrop = component.find("backdrop");
    console.log("backdrop:", backdrop);
    $A.util.removeClass(backdrop, "slds-backdrop--open");

    jQuery.noConflict()("[id$=calendar]").fullCalendar("refetchEvents");
  },
  goToUrl: function (url) {
    // console.log('goToUrl(url :' + url + ')')

    if (url) {
      var urlEvent = $A.get("e.force:navigateToURL");
      urlEvent.setParams({
        url: url
      });
      urlEvent.fire();
    }
  }
});