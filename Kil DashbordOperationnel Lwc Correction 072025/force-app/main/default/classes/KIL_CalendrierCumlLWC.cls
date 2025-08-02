public with sharing class KIL_CalendrierCumlLWC {
    public class OptionWrapper {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        public OptionWrapper(String l, String v) { label = l; value = v; }
    }

    public class AffectationJourWrapper {
        @AuraEnabled public Id affectationId;
        @AuraEnabled public Id ressourceId;
        @AuraEnabled public Date jour;
        @AuraEnabled public Decimal duree;
        @AuraEnabled public String typeActivite;
        @AuraEnabled public String imputation;
        @AuraEnabled public String recordType;
        @AuraEnabled public String statut;
        @AuraEnabled public String nomAffaire;
    }

    public class CumulRHWrapper {
        @AuraEnabled public String nomRessource;
        @AuraEnabled public Decimal joursFactures;
        @AuraEnabled public Decimal joursPotentielBrut;
        @AuraEnabled public Decimal nombreAbsences;
        @AuraEnabled public Decimal potentielFinal;
        @AuraEnabled public Decimal joursHotlineOuRD;
        @AuraEnabled public Decimal joursAVV;
        @AuraEnabled public Decimal joursSansActivite;
    }

    private static Decimal roundQuarter(Decimal v) {
        if (v == null) return 0;
        return ((v * 4).setScale(0, RoundingMode.HALF_UP)) / 4;
    }

@AuraEnabled(cacheable=true)
public static Map<String, List<OptionWrapper>> getFilterOptions() {
    List<OptionWrapper> buOpts   = new List<OptionWrapper>{ new OptionWrapper('Tous','') };
    List<OptionWrapper> compOpts = new List<OptionWrapper>{ new OptionWrapper('Tous','') };
    List<OptionWrapper> manOpts  = new List<OptionWrapper>{ new OptionWrapper('Tous','') };
    List<OptionWrapper> typeRessourceOptions = new List<OptionWrapper>{ new OptionWrapper('Tous', '') };

    for (AggregateResult ar : [
        SELECT BU__c b FROM SuiviRH__c WHERE BU__c != NULL AND PosteActuel__c = true GROUP BY BU__c
    ]) {
        buOpts.add(new OptionWrapper(String.valueOf(ar.get('b')), String.valueOf(ar.get('b'))));
    }

    for (AggregateResult ar : [
        SELECT Competence__r.Name c FROM SuiviRH__c WHERE Competence__c != NULL AND PosteActuel__c = true GROUP BY Competence__r.Name
    ]) {
        compOpts.add(new OptionWrapper(String.valueOf(ar.get('c')), String.valueOf(ar.get('c'))));
    }

    for (AggregateResult ar : [
        SELECT Manager__c mId, Manager__r.Name mName
        FROM SuiviRH__c
        WHERE Manager__c != NULL AND PosteActuel__c = true
        GROUP BY Manager__c, Manager__r.Name
    ]) {
        manOpts.add(new OptionWrapper(String.valueOf(ar.get('mName')), String.valueOf(ar.get('mId'))));
    }

    for (AggregateResult ar : [
        SELECT RecordType.Name rtName, RecordTypeId rtId
        FROM RessourceHumaine__c
        WHERE RecordTypeId != null
        GROUP BY RecordType.Name, RecordTypeId
    ]) {
        typeRessourceOptions.add(new OptionWrapper(String.valueOf(ar.get('rtName')), String.valueOf(ar.get('rtId'))));
    }

    return new Map<String, List<OptionWrapper>>{
        'buOptions'             => buOpts,
        'competenceOptions'     => compOpts,
        'managerOptions'        => manOpts,
        'typeRessourceOptions'  => typeRessourceOptions
    };
}


    @AuraEnabled(cacheable=true)
    public static List<RessourceHumaine__c> getFilteredRessources(String bu, String competence, Id managerId, Id recordTypeId) {
        String soql = 'SELECT Ressource_humaines__c FROM SuiviRH__c WHERE Ressource_humaines__c != NULL AND PosteActuel__c = true';
        if (String.isNotBlank(bu)) soql += ' AND BU__c = :bu';
        if (String.isNotBlank(competence)) soql += ' AND Competence__r.Name = :competence';
        if (managerId != null && String.isNotBlank(managerId)) soql += ' AND Manager__c = :managerId';
        if (recordTypeId != null) {
    soql += ' AND Ressource_humaines__r.RecordTypeId = :recordTypeId';
}

        soql += ' GROUP BY Ressource_humaines__c';

        Set<Id> ids = new Set<Id>();
        for (AggregateResult ar : Database.query(soql)) {
            ids.add((Id)ar.get('Ressource_humaines__c'));
        }

        return [
            SELECT Id, Name, CalendrierModele__c
            FROM RessourceHumaine__c
            WHERE Id IN :ids
            AND Ressource_planifiable__c = true AND CalendrierModele__c != NULL AND RessourceGenerique__c = False
        ];
    }

    @AuraEnabled
    public static Map<String, List<CumulRHWrapper>> getCumulByGroup(List<Id> rhIds, Date startDate, Date endDate, String groupBy) {
        if (startDate == null || endDate == null) throw new AuraHandledException('Dates requises.');
        if (rhIds == null || rhIds.isEmpty()) throw new AuraHandledException('Ressources requises.');

        Map<Id, RessourceHumaine__c> rhMap = new Map<Id, RessourceHumaine__c>(
            [SELECT Id, Name, CalendrierModele__c, Soci_t_tablissement__r.Societe__r.Name FROM RessourceHumaine__c WHERE Id IN :rhIds]

        );

        Map<Id, SuiviRH__c> svMap = new Map<Id, SuiviRH__c>();
        for (SuiviRH__c s : [
            SELECT Ressource_humaines__c, BU__c, Competence__c, Competence__r.Name
            FROM SuiviRH__c
            WHERE Ressource_humaines__c IN :rhIds AND PosteActuel__c = true
        ]) {
            svMap.put(s.Ressource_humaines__c, s);
        }

        Map<Id, Map<Date, List<AffectationJourWrapper>>> dayMap = getAffectationsByDay(rhIds, startDate, endDate);
        Map<String, List<CumulRHWrapper>> res = new Map<String, List<CumulRHWrapper>>();

        for (Id rhId : rhIds) {
            RessourceHumaine__c rh = rhMap.get(rhId);
            SuiviRH__c sv = svMap.get(rhId);

            String grp;
            if (groupBy == 'BU') grp = (sv != null && sv.BU__c != null) ? sv.BU__c : 'Non défini';
            else if (groupBy == 'Competence') grp = (sv != null && sv.Competence__r != null) ? sv.Competence__r.Name : 'Non défini';
            else grp = (rh != null && rh.Name != null) ? rh.Name : 'Non défini';

            Decimal fact = 0, hot = 0, avv = 0, abs = 0;
            if (dayMap.containsKey(rhId)) {
                for (List<AffectationJourWrapper> lst : dayMap.get(rhId).values()) {
                    for (AffectationJourWrapper w : lst) {
                        if (w.typeActivite == 'Facturée') fact += w.duree;
                        else if (w.typeActivite == 'Hotline/R&D') hot += w.duree;
                        else if (w.typeActivite == 'AVV') avv += w.duree;
                        else if (w.typeActivite == 'Absence') abs += w.duree;
                    }
                }
            }

            // DateTime dtStart = DateTime.newInstanceGMT(startDate, Time.newInstance(0, 0, 0, 0));
            // DateTime dtEnd = DateTime.newInstanceGMT(endDate, Time.newInstance(23, 59, 59, 999));
            // Long ms = BusinessHours.diff(rh.CalendrierModele__c, dtStart, dtEnd);
            // Decimal jBrut = (ms != null) ? ms / (1000 * 60 * 60 * 7) : 0;

            // Decimal net = jBrut - abs;
            // Decimal sans = net - fact - hot - avv;

            DateTime dtStart = DateTime.newInstanceGMT(startDate, Time.newInstance(0, 0, 0, 0));
DateTime dtEnd = DateTime.newInstanceGMT(endDate, Time.newInstance(23, 59, 59, 999));
Long ms = BusinessHours.diff(rh.CalendrierModele__c, dtStart, dtEnd);

// ⚠️ Diviseur selon la société
Integer heuresParJour = 8;
Decimal jBrut = (ms != null) ? ms / (1000 * 60 * 60 * heuresParJour) : 0;

Decimal net = jBrut - abs;
Decimal sans = net - fact - hot - avv;


            CumulRHWrapper c = new CumulRHWrapper();
            c.nomRessource       = rh.Name;
            c.joursFactures      = roundQuarter(fact);
            c.joursHotlineOuRD   = roundQuarter(hot);
            c.joursAVV           = roundQuarter(avv);
            c.nombreAbsences     = roundQuarter(abs);
            c.joursPotentielBrut = roundQuarter(jBrut);
            c.potentielFinal     = roundQuarter(net);
            c.joursSansActivite  = roundQuarter(sans);

            if (!res.containsKey(grp)) res.put(grp, new List<CumulRHWrapper>());
            res.get(grp).add(c);
        }

        return res;
    }

    // @AuraEnabled
    // public static Map<Id, Map<Date, List<AffectationJourWrapper>>> getAffectationsByDay(List<Id> rhIds, Date startDate, Date endDate) {
    //     if (startDate == null || endDate == null) throw new AuraHandledException('Dates requises.');
    //     if (rhIds == null || rhIds.isEmpty()) throw new AuraHandledException('Ressources requises.');
    
    //     Map<Id, String> calMap = new Map<Id, String>();
    //     for (RessourceHumaine__c r : [SELECT Id, CalendrierModele__c FROM RessourceHumaine__c WHERE Id IN :rhIds]) {
    //         calMap.put(r.Id, r.CalendrierModele__c);
    //     }
    
    //     List<Affectation__c> affs = [
    //         SELECT Id, RessourceHumaine__c, DateDeDebut__c, DateDeFin__c, NombreJours__c,
    //                ActiviteFactureeFerme__c, AvantVente__c, REtD__c, ActiviteSupport__c, Absences__c,
    //                RecordType.DeveloperName, Statut__c, Imputation_anlytique__c, AffaireName__c
    //         FROM Affectation__c
    //         WHERE RessourceHumaine__c IN :rhIds
    //           AND DateDeDebut__c <= :endDate AND DateDeFin__c >= :startDate
    //           AND RecordType.DeveloperName != 'Planification'
    //     ];
    
    //     Map<Id, Map<Date, List<AffectationJourWrapper>>> res = new Map<Id, Map<Date, List<AffectationJourWrapper>>>();
    
    //     for (Affectation__c a : affs) {
    //         Id rhId = a.RessourceHumaine__c;
    
    //         Date startDateOnly = a.DateDeDebut__c.date();
    //         Date endDateOnly = a.DateDeFin__c.date();
    //         Integer nbDays = startDateOnly.daysBetween(endDateOnly) + 1;
    
    //         for (Integer i = 0; i < nbDays; i++) {
    //             Date cur = startDateOnly.addDays(i);

    //             DateTime segStart = (cur == startDateOnly) ? a.DateDeDebut__c : DateTime.newInstanceGMT(cur, Time.newInstance(0, 0, 0, 0));
    //             DateTime segEnd = (cur == endDateOnly) ? a.DateDeFin__c : DateTime.newInstanceGMT(cur, Time.newInstance(23, 59, 59, 999));
    
    //             Long ms = BusinessHours.diff(calMap.get(rhId), segStart, segEnd);
    //             if (ms == null || ms <= 0) continue;
    
    //             Decimal j = (nbDays == 1 && a.NombreJours__c != null && a.NombreJours__c < 1)
    //                 ? a.NombreJours__c
    //                 : Decimal.valueOf(ms) / (1000 * 60 * 60 * 8);
    
    //             j = roundQuarter(j);

    //                             System.debug('🧩 JOUR AJOUTÉ: ' + cur + ' | RH=' + rhId + ' | durée=' + j + ' | Type=' + defineType(a));

    
    //             if (!res.containsKey(rhId)) res.put(rhId, new Map<Date, List<AffectationJourWrapper>>());
    //             if (!res.get(rhId).containsKey(cur)) res.get(rhId).put(cur, new List<AffectationJourWrapper>());
    
    //             AffectationJourWrapper w = new AffectationJourWrapper();
    //             w.affectationId = a.Id;
    //             w.ressourceId   = rhId;
    //             w.jour          = cur;
    //             w.duree         = j;
    //             w.typeActivite  = defineType(a);
    //             w.imputation    = a.Imputation_anlytique__c;
    //             w.recordType    = a.RecordType.DeveloperName;
    //             w.statut        = a.Statut__c;
    //             w.nomAffaire    = a.AffaireName__c;
    
    //             res.get(rhId).get(cur).add(w);
    //         }
    //     }
    
    //     return res;
    // }

    @AuraEnabled
public static Map<Id, Map<Date, List<AffectationJourWrapper>>> getAffectationsByDay(List<Id> rhIds, Date startDate, Date endDate) {
    if (startDate == null || endDate == null) throw new AuraHandledException('Dates requises.');
    if (rhIds == null || rhIds.isEmpty()) throw new AuraHandledException('Ressources requises.');

    Map<Id, String> calMap = new Map<Id, String>();
    for (RessourceHumaine__c r : [SELECT Id, CalendrierModele__c FROM RessourceHumaine__c WHERE Id IN :rhIds]) {
        calMap.put(r.Id, r.CalendrierModele__c);
    }

    
    DateTime endOfDay = DateTime.newInstanceGMT(endDate, Time.newInstance(23, 59, 59, 999));
    System.debug('📥 Query affectations du ' + startDate + ' au ' + endOfDay + ' pour RH=' + rhIds);

    List<Affectation__c> affs = [
        SELECT Id, RessourceHumaine__c, DateDeDebut__c, DateDeFin__c, NombreJours__c,
               ActiviteFactureeFerme__c, AvantVente__c, REtD__c, ActiviteSupport__c, Absences__c,
               RecordType.DeveloperName, Statut__c, Imputation_anlytique__c, AffaireName__c
        FROM Affectation__c
        WHERE RessourceHumaine__c IN :rhIds
          AND DateDeDebut__c <= :endOfDay AND DateDeFin__c >= :startDate
          AND RecordType.DeveloperName != 'Planification'
    ];

    System.debug('📦 Affectations trouvées : ' + affs.size());
    for (Affectation__c a : affs) {
        System.debug('🗂 Affectation récupérée : ID=' + a.Id + ' | RH=' + a.RessourceHumaine__c +
            ' | Début=' + a.DateDeDebut__c.format() + ' | Fin=' + a.DateDeFin__c.format());
    }

    Map<Id, Map<Date, List<AffectationJourWrapper>>> res = new Map<Id, Map<Date, List<AffectationJourWrapper>>>();

    for (Affectation__c a : affs) {
        Id rhId = a.RessourceHumaine__c;

        Date startDateOnly = a.DateDeDebut__c.date();
        Date endDateOnly = a.DateDeFin__c.date();

        // Troncature aux limites filtrées
        if (startDateOnly < startDate) startDateOnly = startDate;
        if (endDateOnly > endDate) endDateOnly = endDate;

        Integer nbDays = startDateOnly.daysBetween(endDateOnly) + 1;

        for (Integer i = 0; i < nbDays; i++) {
            Date cur = startDateOnly.addDays(i);

            DateTime segStart = (cur == a.DateDeDebut__c.date())
                ? a.DateDeDebut__c
                : DateTime.newInstanceGMT(cur, Time.newInstance(0, 0, 0, 0));

            DateTime segEnd;
            if (cur == a.DateDeFin__c.date()) {
                Time finHeure = a.DateDeFin__c.time();
                segEnd = (finHeure == Time.newInstance(0, 0, 0, 0))
                    ? DateTime.newInstanceGMT(cur, Time.newInstance(23, 59, 59, 999))
                    : a.DateDeFin__c;
                if (segEnd <= segStart) segEnd = DateTime.newInstanceGMT(cur, Time.newInstance(18, 0, 0, 0));
            } else {
                segEnd = DateTime.newInstanceGMT(cur, Time.newInstance(23, 59, 59, 999));
            }

            Long ms = BusinessHours.diff(calMap.get(rhId), segStart, segEnd);

            System.debug('🧪 JOUR TRAITÉ : ' + cur + ' | segStart=' + segStart.format() + ' | segEnd=' + segEnd.format() +
                         ' | ms=' + ms);

            if (ms == null || ms <= 0) {
                System.debug('⛔ ms null ou <= 0 → ignoré');
                continue;
            }

            Decimal j = (nbDays == 1 && a.NombreJours__c != null && a.NombreJours__c < 1)
                ? a.NombreJours__c
                : Decimal.valueOf(ms) / (1000 * 60 * 60 * 8);

            j = roundQuarter(j);

            System.debug('✅ JOUR AJOUTÉ: ' + cur + ' | RH=' + rhId + ' | durée=' + j + ' | Affectation=' + a.Id);

            if (!res.containsKey(rhId)) res.put(rhId, new Map<Date, List<AffectationJourWrapper>>());
            if (!res.get(rhId).containsKey(cur)) res.get(rhId).put(cur, new List<AffectationJourWrapper>());

            AffectationJourWrapper w = new AffectationJourWrapper();
            w.affectationId = a.Id;
            w.ressourceId   = rhId;
            w.jour          = cur;
            w.duree         = j;
            w.typeActivite  = defineType(a);
            w.imputation    = a.Imputation_anlytique__c;
            w.recordType    = a.RecordType.DeveloperName;
            w.statut        = a.Statut__c;
            w.nomAffaire    = a.AffaireName__c;

            res.get(rhId).get(cur).add(w);
        }
    }

    return res;
}







    

    // private static String defineType(Affectation__c a) {
    //     if (a.ActiviteFactureeFerme__c != null && a.ActiviteFactureeFerme__c > 0) return 'Facturée';
    //     if (a.REtD__c != null && a.REtD__c > 0) return 'Hotline/R&D';
    //     if (a.ActiviteSupport__c != null && a.ActiviteSupport__c > 0) return 'Hotline/R&D';
    //     if (a.AvantVente__c != null && a.AvantVente__c > 0 ) return 'AVV';
    //     if (a.Absences__c != null && a.Absences__c != 0) return 'Absence';
    //     return 'Autre';
    // }

    private static String defineType(Affectation__c a) {
    // Classer par imputation analytique
    if (String.isNotBlank(a.Imputation_anlytique__c)) {
        String imp = a.Imputation_anlytique__c.toLowerCase();
        if (imp.contains('factur')) return 'Facturée';
        if (imp.contains('r&d') || imp.contains('support') || imp.contains('hotline')) return 'Hotline/R&D';
        if (imp.contains('commerce') || imp.contains('avv')) return 'AVV';
        if (imp.contains('absence')) return 'Absence';
        if (imp.contains('interne') || imp.contains('inter-contrat') || imp.contains('formation')) return 'Autre'; // ou spécifique si besoin
    }

    // Sinon fallback sur les anciens champs (au cas où)
    if (a.ActiviteFactureeFerme__c != null && a.ActiviteFactureeFerme__c > 0) return 'Facturée';
    if (a.REtD__c != null && a.REtD__c > 0) return 'Hotline/R&D';
    if (a.ActiviteSupport__c != null && a.ActiviteSupport__c > 0) return 'Hotline/R&D';
    if (a.AvantVente__c != null && a.AvantVente__c > 0 ) return 'AVV';
    if (a.Absences__c != null && a.Absences__c != 0) return 'Absence';

    return 'Autre';
}

}