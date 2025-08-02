({
    doInit: function (component) {
        let myRecordId = component.get("v.recordId");

       let action = component.get(
            "c.isThisRecordARHWithoutAnyActivePosteDeCarriere"
        );

        action.setParams({
            recordIdStr: myRecordId
        });

        action.setCallback(component, function (data) {
            if (data.getState() === "SUCCESS") {
                // console.log('This RH is not enabled ?', JSON.stringify(data.getReturnValue()))
                component.set(
                    "v.isThisRecordARHWithoutAnyActivePosteDeCarriere",
                    data.getReturnValue()
                );
            } else console.error("error !", data.getError());
        });
        $A.enqueueAction(action);

        // Every fields used in the display of affectation should be here
        let affectationFieldsToQuery = {
            titleField: component.get("v.titleField"),
            numeroField: component.get("v.numeroField"),
            durationValueField: component.get("v.durationValueField"),
            durationUniteField: component.get("v.durationUniteField"),
            descriptionField: component.get("v.descriptionField"),
            userField: component.get("v.userField"),
            affaireNameField: component.get("v.affaireNameField"),
            laffaireNameField: component.get("v.laffaireNameField"),
            ressourceHumaineField: component.get("v.ressourceHumaineField"),
            ressourceMaterielleField: component.get(
                "v.ressourceMaterielleField"
            ),
            startDateTimeField: component.get("v.startDateTimeField"),
            endDateTimeField: component.get("v.endDateTimeField"),
            ressourceHumaineTrigrammeField: component.get(
                "v.ressourceHumaineTrigrammeField"
            ),
            ressourceHumaineFullNameField: component.get(
                "v.ressourceHumaineFullNameField"
            ),
            ressourceHumaineRecordTypeField: component.get(
                "v.ressourceHumaineRecordTypeField"
            ),
            ressourceHumaineTiersField: component.get(
                "v.ressourceHumaineTiersField"
            ),
            ressourceMaterielleNameField: component.get(
                "v.ressourceMaterielleNameField"
            ),
            ressourceMaterielleRecordTypeField: component.get(
                "v.ressourceMaterielleRecordTypeField"
            ),
            eventValidationField: component.get("v.eventValidationField"),
            eventBackgroundColorField: component.get(
                "v.eventBackgroundColorField"
            ),
            locationField: component.get("v.locationField")
        };
        // console.log("affectationFieldsToQuery:", affectationFieldsToQuery);
        component.set(
            "v.listFieldsToQuery",
            JSON.stringify(affectationFieldsToQuery)
        );

        // console.log(
        //     'component.get("v.listFieldsToQuery") :',
        //     component.get("v.listFieldsToQuery")
        // );
    }
});