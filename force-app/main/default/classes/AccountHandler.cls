public class AccountHandler 
{
    public static Account insertNewAccount(String name)
    {
        
        try{
        Account newAccount = new Account();
        newAccount.Name= name;
        insert newAccount;
        return newAccount;
        }catch(Exception e)
        {
            return null;
        }
        
    }
}