public with sharing class AffectationPlanificationController {
    @AuraEnabled(cacheable=true)
    public static String getRessourceHumaineFromUser() {
        Id uid = UserInfo.getUserId();
        RessourceHumaine__c rh = [
            SELECT Id
            FROM RessourceHumaine__c
            WHERE UtilisateurSalesforce__c = :uid
            LIMIT 1
        ];
        return rh.Id;
    }

    @AuraEnabled(cacheable=true)
    public static List<Affectation__c> getAffectationsPlanification(String ressourceId, Integer mois, Integer annee) {
        return [
            SELECT Id, Titre__c, NombreJours__c, Mois__c, Annee__c,
                   Tiers__r.Name, Affaire__r.Name
            FROM Affectation__c
            WHERE RecordType.DeveloperName = 'Planification'
              AND RessourceHumaine__c = :ressourceId
              AND Mois__c = :mois
              AND Annee__c = :annee
        ];
    }
}
