import { LightningElement, track, api, wire } from 'lwc';
import initiateContact from '@salesforce/apex/SelfRegisterController.initiateContact';
import validateEmail from '@salesforce/apex/SelfRegisterController.validateEmail';
import selfRegister from '@salesforce/apex/SelfRegisterController.selfRegister';
import getLoginLink from '@salesforce/apex/SelfRegisterController.getLoginLink';
import recaptcha from '@salesforce/resourceUrl/recaptcha';
import ccThemeMinimumMrcgoShop from '@salesforce/resourceUrl/CC_Theme_Minimum_MrcgoShop';
import getUrls from '@salesforce/apex/SelfRegisterController.getCommunityNameAndUrls';
import communityId from '@salesforce/community/Id';
import linkedin from '@salesforce/contentAssetUrl/linkedin';
import Site from '@salesforce/schema/Account.Site';
import Id from '@salesforce/user/Id';
import Username from '@salesforce/schema/User.Username';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import sendForgotPassword from '@salesforce/apex/SelfRegisterController.sendForgotPassword';
import populateUsernameWithOrg from '@salesforce/apex/SelfRegisterController.populateUsernameWithOrg';
import SystemModstamp from '@salesforce/schema/Account.SystemModstamp';

export default class SelfRegisterLwc extends LightningElement {
    @track errorMessage = '';
    @track spinner = false;
    @track recaptchaSubmitted = false;
    @track showAdditionalInformation = false;
    @track customerRadioButton;
    @track supplierRadioButton;
    @track registerAccountButton = true;
    @track accountType = '';
    @track isModalOpen = false;
    @track connectingYouNow = false;
    @track internationalThankYou = false;
    @track contactNoAzureLinkThankYou = false;
    @track contactWithAzureLinkThankYou = false;

    @track firstName = '';
    @track lastName = '';
    @track email = '';
    @track federatedUser=false;
    @track phone = '';
    @track poNumbers = '';
    @track ddlcountry = 'US';
    @track postalCode = '';
    @track isUSCashSale = false;
    @track accountFound = false;
    @track isCashSale = false;
    @track redirectLoginURL = '';
    @track redirectPageUrl = '';

    @track supplierStreetAddress = '';
    @track supplierCity = '';
    @track usState = '';
    @track supplierPostalCode = '';

    @track companyName = '';
    @track supplierDepartment = '';
    @track supplierTitle = '';
    @track mrcGlobalBranch = '';
    @track mrcGlobalSalesRep = '';

    @track contactId = '';
    @track stage = ''; 

    loadingGifUrl = ccThemeMinimumMrcgoShop + '/images/loading.gif';
    recaptchaUrl = recaptcha;
    validSoFar = false;    

    UserId=Id;
    loginInUsername =Username;
    termsOfUseURL = '';
    privacyStatementURL = 'https://www.mrcglobal.com/Privacy-Statement';

    //-------------------------------------------------//
    // Get functions
    //-------------------------------------------------//
    get showError() {
        return this.errorMessage !== '';
    }
    get showAdditionalInfoPostalCode() {
        return this.isUSCashSale && !this.supplierRadioButton;
    }
    
    @wire(getUrls, { communityId : communityId})
    wiredUrls({ error, data }) {   
        if (data) {
            var parsedCommunityDetails = JSON.parse(data);
            if (parsedCommunityDetails.communityUrls) {
                var urls = parsedCommunityDetails.communityUrls;
                for(var i=0; i<urls.length; i++){
                    if (urls[i].Label == 'Customer Self Register'){
                        this.customerUrl = urls[i].Value__c;
                    }
                    else if (urls[i].Label == 'Supplier Self Register'){
                        this.supplierUrl = urls[i].Value__c;
                    }
                }
            }
            this.errorMessage = '';

            if (parsedCommunityDetails.communityName && parsedCommunityDetails.communityName == 'Customer Community') {
                this.accountType = 'customer';
                this.customerRadioButton = true;
                this.supplierRadioButton = false;
                this.showAdditionalInformation = false;
                this.redirectPageUrl = this.supplierUrl;
            } else if (parsedCommunityDetails.communityName && parsedCommunityDetails.communityName == 'Vendor Community') {
                this.accountType = 'vendor';
                this.customerRadioButton = false;
                this.supplierRadioButton = true;
                this.showAdditionalInformation = true;
                this.redirectPageUrl = this.customerUrl;
            }
        } else if (error) {
            this.errorMessage = error;
        }
    }

    closeModal() {
        this.isModalOpen = false;
        this.connectingYouNow = false;
        this.internationalThankYou = false;
        this.contactNoAzureLinkThankYou = false;
        this.contactWithAzureLinkThankYou = false;
        
    }

    handleAccountTypeChange(event) {
        console.log("this.accountType => ", this.accountType);
        console.log("event.target.value handleAccountTypeChange => ", event.target.value);

        if (this.accountType != event.target.value) {
            console.log("test");
            window.open(this.redirectPageUrl, "_self");
        }
    }
    //-------------------------------------------------//

    //-------------------------------------------------//
    // Validation of key press and data to then be submitted
    //-------------------------------------------------//
    onKeyUp(event) {
        if (event.keyCode === 13 || event.charCode === 13) {
            this.handleChange(event, true);
        }
    }
    
    handleChange(event, enterKeyPress) {
        if(event){
            this[event.target.name] = event.target.value;

            if (window.event) {
                event = window.event;
            }
            var keyCode;
            if (event.keyCode) {
                keyCode = event.keyCode;
            } else {
                keyCode = event.charCode;
            }
        }

        this.registerAccountButton = !this.checkValidity(event);
        if (enterKeyPress === true && !this.registerAccountButton && !this.showAdditionalInformation) {
            this.handleUserSubmit();
            
        } else if (enterKeyPress === true && !this.registerAccountButton && this.showAdditionalInformation){
            if(this.companyName != null && this.postalCode != null ){
            this.registerAccountButton =false;
            this.handleSelfRegister();}
            
        }
    }

    checkValidity() {
        var validCountry = true;
        const isInputsCorrect = [...this.template.querySelectorAll('lightning-input')]
        .reduce((validSoFar, inputField) => {
            // inputField.reportValidity();
            return validSoFar && inputField.checkValidity();
        }, true);
        this.termsAccepted = this.template.querySelector('[data-id="terms"]').checked;
        this.ddlcountry = this.template.querySelector('[data-id="ddlcountry"]').value;
        if(this.ddlcountry == '') {
            validCountry = false;
        }

        return isInputsCorrect && validCountry && this.recaptchaSubmitted && this.termsAccepted;
    }
    //-------------------------------------------------//

    handleUserSubmit() {
        this.spinner = true;       
        if (this.checkValidity) {
            validateEmail({email:this.email})
                .then(result => {
                    if (result) {
                        this.errorMessage = result;
                    } else {
                        console.log("this.accountType => ", this.accountType);
                        this.errorMessage = '';
                        if (this.customerRadioButton == true) {

                            let customerVendorDescription = this.createCustomerVendorDescription();

                            var contact = {
                                firstName: this.firstName,
                                lastName: this.lastName,
                                email: this.email,
                                Email__c: this.email,
                                phone: this.phone,
                                description: customerVendorDescription,
                                mailingCountry: this.ddlcountry,
                                Subscribe_Global__c: this.template.querySelector('[data-id="emails"]').checked,
                                Subscribe_Global_Date__c: this.template.querySelector('[data-id="emails"]').checked ? Date.now() : null
                            };
                            console.log("contact => ", contact);

                            initiateContact({
                                accountType:this.accountType,
                                contactJson:JSON.stringify(contact)
                                })
                                .then(result => {
                                    if (result) {
                                        var response = JSON.parse(result);
                                        this.errorMessage = result;
                                        if(response['contactId']){
                                            this.contactId = response['contactId'];
                                        }
                                        this.accountFound = false;
                                        this.isCashSale = false;
                                        this.errorMessage = '';
                                        if (response['error']) {
                                            this.errorMessage = response['error'];  
                                            this.spinner = false;
                                        } else if (response['accountFound'] && response['accountFound'] == 'true' && response['isCashSale'] && response['isCashSale'] == 'false') {
                                            this.accountFound = true;
                                            this.handleSelfRegister();
                                        } else if (this.ddlcountry && (this.ddlcountry == 'US' || this.ddlcountry == 'CA') && response['isCashSale'] && response['isCashSale'] == 'true') {
                                            this.isCashSale = true;
                                            this.isModalOpen = true;
                                            this.isUSCashSale = true;
                                            this.showAdditionalInformation = true;
                                            this.registerAccountButton = true; //added by rajdeep - AT 182
                                            this.spinner = false;
                                        } else if (this.supplierRadioButton) {
                                            this.handleSelfRegister();
                                        } else {
                                            this.isModalOpen = true;
                                            this.showAdditionalInformation = true;
                                            this.registerAccountButton=true; //added by rajdeep - AT 182
                                            this.spinner = false;
                                        }
                                    } else {
                                        this.spinner = false;
                                    }
                                }) .catch(error => {
                                    let errorData = JSON.parse(error.body.message);
                                    if (errorData.name == "Email Validation Exception") {
                                        this.redirectLoginURL = this.getGenericLogin();
                                        this.contactWithAzureLinkThankYou = true;
                                    } else {
                                        this.errorMessage = errorData.message;
                                    }
                                    this.recaptchaSubmitted = false;
                                    this.spinner = false;
                                });
                        } else {
                            console.log("vendor selected")
                            this.handleChangeToAddressStage();
                            this.spinner = false;
                        }
                    }
                })
                .catch(error => {
                    let errorData = JSON.parse(error.body.message);
                    if (errorData.name == "Email Validation Exception") {
                        this.redirectLoginURL = this.getGenericLogin();
                        this.contactWithAzureLinkThankYou = true;
                    } else {
                        this.errorMessage = errorData.message;
                    }
                    this.spinner = false;
                });
        } else {
            this.errorMessage = "Please complete required fields.";
            this.spinner = false;
        }
    }
    getGenericLogin() {
        var currentPageUrl = window.location.href.toString();
        var currentPageUrl = currentPageUrl.replace("SelfRegister", "");
        console.log({currentPageUrl});
        return currentPageUrl;
    }
    handleChangeToAddressStage() {
        this.changeToAddressStage()
            .then(()=>{
                this.handleChange();               
            });
    }
    async changeToAddressStage(){
        this.stage = 'address';
        return; 
    }
    createCustomerVendorDescription() {
        let customerVendorDescription = 'Company: ' + this.companyName + '\nAccount Zip: ';
        if (this.supplierRadioButton == true) {
            customerVendorDescription = customerVendorDescription + '\nPO Numbers: ' + this.poNumbers;
        } else if (this.customerRadioButton == true) {
            customerVendorDescription = customerVendorDescription + '\nAccount Number: ';
            customerVendorDescription = customerVendorDescription + '\nHas Mrc Account: ';
        }
        return customerVendorDescription;
    }
    handleSelfRegister() {
        this.spinner = true;
        try {
            if (this.checkValidity) {
                if (this.supplierRadioButton){
                    validateEmail({email:this.email})
                        .then(result => {
                            if (result) {
                                this.errorMessage = result;
                            } else {
                                console.log("In handleSelfRegister-checkValidity");
                                this.handlePostAVSCheckRegistration();
                            }
                        })
                        .catch(error => {
                            let errorData = JSON.parse(error.body.message);
                            if (errorData.name == "Email Validation Exception") {
                                this.redirectLoginURL = this.getGenericLogin();
                                this.contactWithAzureLinkThankYou = true;
                            } else {
                                this.errorMessage = errorData.message;
                            }
                            this.spinner = false;
                        });
                } else {
                    this.handlePostAVSCheckRegistration();
                }
            } else {
                this.errorMessage = "Please complete required fields.";
                this.spinner = false;
            }
        } catch(ex) {
            console.log(ex);
            this.spinner = false;
        }
    }
    handlePostAVSCheckRegistration() {
        try {
            this.spinner = true;

            let customerVendorDescription = this.createCustomerVendorDescription();
            if (this.supplierRadioButton) {
                this.postalCode = this.supplierPostalCode;
            }
            var contact = {
                department: this.supplierDepartment,
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                Email__c: this.email,
                phone: this.phone,
                mailingCountry: this.ddlcountry,
                mailingPostalCode: this.postalCode,
                mailingStreet: this.supplierStreetAddress,
                mailingCity: this.supplierCity,
                mailingState: this.usState,
                MRC_Contact_Name__c: this.mrcGlobalSalesRep,
                MRC_Branch_Location__c: this.mrcGlobalBranch,
                title: this.supplierTitle,
                description: customerVendorDescription,
                Subscribe_Global__c: this.template.querySelector('[data-id="emails"]').checked,
                Subscribe_Global_Date__c: this.template.querySelector('[data-id="emails"]').checked ? Date.now() : null
            };
            console.log('Contact: ' ,contact);

            selfRegister({
                accountType:this.accountType,
                contactJson:JSON.stringify(contact),
                })
                .then(result => {
                    this.spinner = true;
                    if (result['error']) {
                        this.errorMessage = result;
                        this.spinner = false;
                    } else {
                        if (result['federatedEmail'] && result['federatedEmail']=='true'){
                            this.federatedUser=true;
                        }
                        // AT-198 below line was commented to skip the wait time for Azure login link for non-federated users
                        // if ((this.accountFound && !this.isCashSale) || (this.ddlcountry && this.ddlcountry == 'US' && this.isCashSale) || (this.ddlcountry && this.ddlcountry == 'CA' && this.isCashSale)) {
                        
                        // Below if-block will poll for Azure login invite URL to be returned for the user / contact 
                        if (this.accountFound && !this.isCashSale){
                            this.spinner = false;
                            this.connectingYouNow = true;
                            this.errorMessage = '';
                           
                            var calledForURL = 0;
                            var waitInterval = setInterval(function() {
                                if (!this.contactWithAzureLinkThankYou && calledForURL < 12) {
                                    calledForURL++;
                                    this.getLoginLink1();
                                } else {
                                    clearInterval(waitInterval);
                                    this.finishLoginLink();
                                }
                            }.bind(this), 5000);
                        } else {
                            this.errorMessage = '';
                            this.internationalThankYou = true;
                            this.spinner = false;
                        }
                    }
                })
                .catch(error => {
                    let errorData = JSON.parse(error.body.message);
                    this.errorMessage = errorData.message;
                    this.recaptchaSubmitted = false;
                });
        } catch(ex) {
            console.log(ex);
            this.spinner = false;
        }
    }
    showSuccessToast() {
        const evt = new ShowToastEvent({
            title: 'Success',
            message: 'Email has been sent sucessfully.',
            variant: 'success',
            mode: 'dismissable'
        });
        this.dispatchEvent(evt);
    }
    navigateHomePage() {
        populateUsernameWithOrg({username: this.email})
        .then(response => {
            this.loginInUsername = response
            // console.log('popoulatedUsername 429',this.loginInUsername);
           
            sendForgotPassword({username: this.loginInUsername})
             .then(response => {
                 this.showSuccessToast();
                    // console.log('sendforgotpassword 431');
                    })
            .catch(error =>{
                // console.log('error 434 ',error);
                });
                })
        .catch(error =>{console.log('Eror',error);
    });
      window.open("../register-nonfederated","_self");
     
      
    }
    navigateToLogin() {
       /* window.open(this.redirectLoginURL, "_self"); */

        window.open("../register-federated","_self");
        
    }

    finishLoginLink() {
        if (!this.contactWithAzureLinkThankYou) {
            this.contactNoAzureLinkThankYou = true;
            this.spinner = false;
            this.connectingYouNow = false;
        } else {
            this.spinner = false;
        }
    }
    
    async getLoginLink1() {
        // this.spinner = true;
        try {
            getLoginLink({
                contactId:this.contactId
                })
                .then(result => {
                    if (result['error']) {
                        this.errorMessage = result;
                        this.spinner = false;
                    } else {
                        if (result != '') {
                            this.errorMessage = '';
                            this.redirectLoginURL = result;
                            this.contactWithAzureLinkThankYou = true;
                            this.spinner = false;
                            this.connectingYouNow = false;
                        }
                    }
                })
                .catch(error => {
                    let errorData = JSON.parse(error.body.message);
                    this.errorMessage = errorData.message;
                    this.spinner = false;
                });
        } catch (ex) {
            console.log(ex);
            this.spinner = false;
        }
    }
    //-------------------------------------------------//

    //-------------------------------------------------//
    // Recaptcha functions
    //-------------------------------------------------//
    connectedCallback() {
        if(window.addEventListener){
          window.addEventListener("message", this.handleRecaptchaResponse.bind(this));
        }
        this.termsOfUseURL = window.location.href.includes("/s/") ? ('https://docs.google.com/viewer?url=' + window.location.href.substring(0, window.location.href.indexOf("/s/")) + '/resource/PDF_TermsOfUse&embedded=true') : '';
    }
    handleRecaptchaResponse(event){
        console.log('Event 516::',event.data); //Unlock
        if (!event.data.startsWith("AVS")) {
                if (event.origin !== window.location.origin) {
                // Not the expected origin: Reject the message!
                return;
            } 
            if (event.data==="Unlock"){
                if (!this.recaptchaSubmitted) {
                    console.log('recaptha 524:', this.recaptchaSubmitted); //false
                    this.recaptchaSubmitted = true;
                }
            }
        } else if (event.data == "AVSSuccess:true") {
                console.log("received AVS response => ", event.data);
                this.handlePostAVSCheckRegistration();    
        }
    }
}
