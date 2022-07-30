public class Rollup_Method
{
    public static void rollupPaymentsToDonor(Map<id,Donate__c> newMap)
     {
         Set<Id> DonorSet =new Set<id>();
         for(Donate__c p : [select id,Donation__r.Donor__c from Donate__c where Id IN :newMap.keySet()])
         {
             DonorSet.add(p.Donation__r.Donor__c);
         }
         Account acc= new Account();
         acc.Name='Sridevi';
         List<Donor__c> donorUpdates=new List<Donor__c>();
         for(AggregateResult ar:[select sum(Amount__c)totalPaid,Donation__r.Donor__c ra from Donate__c where Donation__r.Donor__c IN :DonorSet group by Donation__r.Donor__c  ])
         {
             Donor__c r=new Donor__c(id=string.valueOf(ar.get('ra')));
             r.Total_Donation__c=double.valueOf(ar.get('totalPaid'));
             donorUpdates.add(r);
         }
         if(!donorUpdates.isEmpty())
         {
             update donorUpdates;
         }
    }
}