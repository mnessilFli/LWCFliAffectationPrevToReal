({
    // Ne pas modifier les parametres des controllers, c'est toujours les 3 : component, event et helper, dans cet ordre
    created: function (component, event, helper) {
        helper.created(component, event);
    },
    launchCalendar: function (component, event, helper) {
        helper.getRecordDataAndPlanningInit(component);
        helper.getBaseurl(component);
    },
    createRecord: function (component, event, helper) {
        let j$ = jQuery.noConflict();
        let calendarElement = j$("[id$=calendar]");

        var evObj = {
            title: component.get("v.titleVal"),
            startDateTime: moment(component.get("v.startDateTimeVal")).format(),
            endDateTime: moment(component.get("v.endDateTimeVal")).format(),
            description: component.get("v.descriptionVal"),
            ressource: component.get("v.selectedLookUpRecord")
        };
        if (component.get("v.idVal")) {
            evObj.id = component.get("v.idVal");
            j$(calendarElement).fullCalendar(
                "removeEvents",
                component.get("v.idVal")
            );
        }
        helper.upsertEvent(component, evObj, function (response) {
            var state = response.getState();
            helper.closeModal(component);
            if (state === "SUCCESS") {
            } else if (state === "INCOMPLETE") {
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
    },
    openModal: function (component, event, helper) {
        helper.openModal(component, event);
        console.log(component.get("v.recordData"));
        console.log(component.get("v.startDateTimeVal"));
    },
    closeModal: function (component, event, helper) {
        helper.closeModal(component);
    },
    closeModalAndGoToUrl: function (component, event, helper) {
        helper.closeModal(component);

        let url = event.getParam("url");
        if (url) helper.goToUrl(url);
    },
    stopPropagation: function (component, event, helper) {
        event.stopPropagation();
    },
    afterRender: function (component, helper) {
        let ret = this.superAfterRender();
        // interact with the DOM here
        console.log("re-render");
        // this.renderCalendar(component, helper)
        return ret;
    },
    render: function (cmp, helper) {
        var ret = this.superRender();
        // do custom rendering here
        console.log("render");
        return ret;
    },
    onTabFocused: function (component, event, helper) {
        // console.log('focus !')

        var focusedTabId = event.getParam("currentTabId");
        // console.log('focusedTabId:', focusedTabId)

        var workspaceAPI = component.find("workspace");

        workspaceAPI
            .getEnclosingTabId()
            .then(function (tabId) {
                // console.log('tabId:', tabId)
                if (tabId == focusedTabId) {
                    // console.log('tab refocused, rerendering the events')
                    jQuery
                        .noConflict()("[id$=calendar]")
                        .fullCalendar("refetchEvents");
                }
            })
            .catch(function (error) {
                console.log(error);
            });
    }
});