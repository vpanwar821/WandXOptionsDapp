import { ApicallsService } from '../services/apicalls.service';
import { ContractsService } from '../services/contracts.service';
import { Component, OnInit } from '@angular/core';
import { LocationStrategy, PlatformLocation, Location } from '@angular/common';
import { LegendItem, ChartType } from '../lbd/lbd-chart/lbd-chart.component';
import { NgForm } from '@angular/forms';

var BigNumber = require('bignumber.js');

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.css'],
	providers: [ ApicallsService, ContractsService ]
})

export class HomeComponent implements OnInit {
	
	display: any;

	private web3Status: string  = '';
	private wandxTokenAddress: string;
	private tokenList: any;
	
	private userAddress: string = '<NA>';
	private contractFee: number = 0;
	private contractFeeFormatted: number = 0;
	private userBalance: number = 0;
	private userBalanceFormatted: number = 0;
	private currentAllowance: number = 0;
	private currentAllowanceFormatted: number = 0;
    private strikePriceSliderValue: number = 0;
	
	base_token: any = '';
	base_tokenJSON: any;
	baseTokenAddress: any = '';
	baseTokenDecimal: any;
	
	quote_token: any = '';
	quote_tokenJSON: any = '';
	qouteTokenAddress: any = '';
	quoteTokenDecimal: any;

	blockTimestamp: any;
	strikePrice: any;
	
	assets_offered: any = '';
	premium: any = '';
	expiryBlock: any = '';

	optionAddress: string = null;
	
	minBlockNumber: any;
	
	newdate: any;
	date: any;
	month: any;
	year: number;
	
	validate: any;
	
	displayWaitingBox: string;
	displayApprovalBox: string;
	displayErrorBox: any;

	waiting_msg: string = '';
	error_msg: string = '';

	displayStepOne: any;
	displayStepTwo: any;
	displayStepThree: any;
	
	constructor( private apiCalls:ApicallsService, private contractsService: ContractsService ) {
		
		this.display = 'none';
		this.displayWaitingBox = 'none';
		this.displayApprovalBox = 'none';
		this.displayErrorBox = 'none';

		this.displayStepOne = 'block';
		this.displayStepTwo = 'none';
		this.displayStepThree = 'none';

		var day = new Date();
		var nextDay = new Date();
		nextDay.setDate(day.getDate() + 1);
		
		this.date = nextDay.getDate();
		if (this.date.length !== 2) {
			this.date = '0' + this.date;
		}
		this.month = nextDay.getMonth() + 1;
		if (this.month.length !== 2) {
			this.month = '0' + this.month;
		}
		this.year = nextDay.getFullYear();

		this.validate = this.year + '-' + this.month + '-' + this.date;
		
		this.premium = 10;

		this.wandxTokenAddress = this.contractsService.getWandxTokenAddress();
		this.tokenList = this.contractsService.getTokenList();
		
		this.base_token = this.tokenList[0].name;
		this.quote_token = this.tokenList[0].name;
	}

	take_special_char(event){
		let l = event.charCode;  	// k = event.keyCode;  (Both can be used)
		return((l > 64 && l < 91) || (l > 96 && l < 123) || l == 8 || l == 32 || (l >= 48 && l <= 57) || l==46);
	}

	ngOnInit() {
		this.contractsService.initWeb3().then((result) => {
			
			let multiplyFactor = new BigNumber(10).pow(18).toNumber();
			this.web3Status = this.contractsService.getweb3Status();

			if(!result){
				return;
			}

			this.userAddress = this.contractsService.getUserAddress();			
			
			this.contractsService.getBalance(this.wandxTokenAddress).then((balance: number) => {
				this.userBalance = balance;
				this.userBalanceFormatted = balance / multiplyFactor;
			});
	
			this.contractsService.getWandxAllowance().then((allowance) => {
				this.currentAllowance = allowance;
				this.currentAllowanceFormatted = allowance / multiplyFactor;
			});
	
			this.contractsService.getContractFee().then((contractFee: number) => {
				this.contractFee = contractFee;
				this.contractFeeFormatted = contractFee / multiplyFactor;
			});
	
			this.contractsService.getBlockNumber().then((blockNumber: number) => {
				this.minBlockNumber = blockNumber + 50;
			});
		});
	}

	onSubmit1(form: HTMLFormElement) {

		if(this.web3Status != 'success'){
			this.error_msg = 'Metamask is not connected yet. Please reload the page and try again.';
			this.displayErrorBox = 'block';
			return;
		}

		this.error_msg = '';
		this.displayApprovalBox = 'block';

		this.base_token = form.value.base_token;
		this.base_tokenJSON = this.contractsService.getTokenObj(this.base_token);
		this.baseTokenDecimal = this.base_tokenJSON.decimals;
		this.baseTokenAddress = this.base_tokenJSON.address;

		this.quote_token = form.value.quote_token;
		this.quote_tokenJSON = this.contractsService.getTokenObj(this.quote_token);
		this.quoteTokenDecimal = this.quote_tokenJSON.decimals;
		this.qouteTokenAddress = this.quote_tokenJSON.address;
		
		this.blockTimestamp = Date.parse(form.value.blockTimestamp);
		this.strikePrice = form.value.strikePrice;

		this.onStepOne();
	}

	onSubmit2(form2: HTMLFormElement) {
		this.error_msg = ''
		this.waiting_msg = 'Issuing Option For You'
		this.displayWaitingBox = 'block';
		
		this.assets_offered = form2.value.assets_offered;
		this.premium = form2.value.premium;
		this.expiryBlock = form2.value.expiryBlock;

		this.onStepTwo();
	}

	onSubmit3(form3: HTMLFormElement) {
		console.log(form3);
	}

	onStepOne() {
		let multiplyFactor = new BigNumber(10).pow(18).toNumber();

		// check if user has allowance to create option
		if (this.currentAllowance >= this.contractFee) {
			this.displayApprovalBox = "none";
			// create new option
			this.createNewOption();
		}else {
			// check user has enough balance to create option
			let allowanceNeeded = this.contractFee - this.currentAllowance;
			if (this.userBalance < allowanceNeeded) {
				this.displayApprovalBox = 'none';
				this.error_msg = 'Sorry! You don\'t have enough WAND. Please use the faucet to request some.';
				this.displayErrorBox = 'block';
				return;
			}

			// get allowance to create option
			this.contractsService.approveWandx(allowanceNeeded).then((result) => {
				this.displayApprovalBox = "none";
				if (!result) {
					this.error_msg = 'Unable to get allowance approval';
					this.displayErrorBox = 'block';
					return;
				}
				this.contractsService.getBalance(this.wandxTokenAddress).then((balance: number) => {
					this.userBalance = balance;
					this.userBalanceFormatted = balance / multiplyFactor;
				});
				this.contractsService.getWandxAllowance().then((allowance) => {
					this.currentAllowance = allowance;
					this.currentAllowanceFormatted = allowance / multiplyFactor;
				});
				// create new option
				this.createNewOption();
			});
		}
	}

	onStepTwo() {
		this.contractsService.issueOption(
			this.assets_offered,
			this.premium,
			this.expiryBlock
		).then((result) => {
			this.displayWaitingBox = 'none';
			if (result === undefined || result === null) {
				this.error_msg = "Unable to issue option at the moment"
				this.displayErrorBox = 'block';
			}
			else {
				this.displayStepTwo = 'none';
				this.displayStepThree = 'block';
				this.apiCalls.createNewOption(
					this.contractsService.getUserAddress(),
					this.optionAddress,
					this.base_token,
					this.quote_token,
					this.strikePrice,
					this.blockTimestamp,
					this.expiryBlock,
					this.assets_offered
				).then((createResult) => {
					console.log('createNewOption api call', createResult);
				});
			}
		});
	}

	createNewOption() {
		this.waiting_msg = "Creating Option For You"
		this.displayWaitingBox = 'block';		
		this.contractsService.createNewOption(
			this.baseTokenAddress,
			this.qouteTokenAddress,
			this.baseTokenDecimal,
			this.quoteTokenDecimal,
			this.strikePrice,
			this.blockTimestamp
		).then((optionAddress) => {
			this.optionAddress = optionAddress;
			this.displayWaitingBox = 'none';
			if (optionAddress === undefined || optionAddress === null) {
				this.error_msg = 'Unable to create option at the moment.';
				this.displayErrorBox = 'block';
			}else{
				this.displayStepOne = 'none';
				this.displayStepTwo = 'block';
			}
		});
	}

	cancel_btn() {
		this.display = 'none';
		this.displayWaitingBox = 'none';
		this.displayErrorBox = 'none';
		this.displayApprovalBox = 'none';
	}

	backButton() {
		this.displayStepTwo = 'none';
		this.displayStepOne = 'block';
	}
	
    changeStrikePriceSliderValue(strikePriceSliderValue){
		this.strikePriceSliderValue = strikePriceSliderValue;
	}

}