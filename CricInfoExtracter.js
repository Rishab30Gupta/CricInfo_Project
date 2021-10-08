// 1)-> The purpose of this project is to extract information of world cup 2019 from
// cricinfo and present that in the form of excel and pdf scorecards.

// 2)-> The real purpose it to learn how to extract information and get expierence with
// javascript. 

// npm init
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excell4node
// npm install pdf-lib

// node CricInfoExtracter.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=worldcup.csv --dataFolder=data

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");

let args = minimist(process.argv);

//1) download data using axios
//2) read using jsdom
//3) manipulate data using array functions
//4) make excel file using excel4node
//5) create folders and make pdf using pdf-lib

let responsePromise = axios.get(args.source);
responsePromise.then(function (response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);   //html file se dom nikaal leya
    let document = dom.window.document;  //dom se document nikaal leya

    let matches = [];   //created matches array
    let matchScoreDivs = document.querySelectorAll("div.match-score-block");  //voh div jisme class lag rhe hai match-score-block
    for (let i = 0; i < matchScoreDivs.length; i++) {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };

        let namePs = matchScoreDivs[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;

        let scoreSpans = matchScoreDivs[i].querySelectorAll("div.score-detail > span.score");
        if (scoreSpans.length == 2) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent;
        } else if (scoreSpans.length == 1) {
            match.t1s = scoreSpans[0].textContent;
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchScoreDivs[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;
        matches.push(match);
    }
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf-8");
    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putTeamInTeamsArrayIfMissing(teams, matches[i]);
    }
    for (let i = 0; i < matches.length; i++) {
        putMatchInAppropriateTeam(teams, matches[i]);
    }
    // console.log(JSON.stringify(team));
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");

    createExcelFile(teams);
    createFolders(teams);
})

function createFolders(teams){
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}
function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 315,
            y: 725,
            size: 8
        });
        page.drawText(t2, {
            x: 315,
            y: 711,
            size: 8
        });
        page.drawText(t1s, {
            x: 315,
            y: 697,
            size: 8
        });
        page.drawText(t2s, {
            x: 315,
            y: 683,
            size: 8
        });
        page.drawText(result, {
            x: 315,
            y: 669,
            size: 8
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    }).catch(function(err){
        console.log(err);
    })
};

function createExcelFile(teams) {
    let wb = new excel.Workbook();  //its a excel file

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);  //different sheets for different teams
        sheet.cell(1, 1).string("vs");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Oppenent Score");
        sheet.cell(1, 4).string("Result");
        for (let j = 0; j < teams[i].matches.length; j++) {
            
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excel);
}

//agar team 1 and team2 array mei nhi hai toh daaldo
function putTeamInTeamsArrayIfMissing(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });
    }
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}

//har team ka doosre team ke saath match ka function
function putMatchInAppropriateTeam(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result,
    });

    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result,
    });
}