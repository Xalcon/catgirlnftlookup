import { ethers } from "./ethers-5.2.esm.min.js";

const topics = {
    topic1: "0x461b336cda56c864fc5408b684573f4a239af8f18b8c386149189732cfada3bb",
    topic2: "0xaece38b14bec9c8de6456ceec1ad7fedee079e30da3ab08489df66f83f748226"
};

const parseData = (str) =>
{
    const data = [];
    for(let i = 0; i < (str.length / 64); i++)
    {
        data.push(ethers.BigNumber.from(`0x${str.substr(i * 64, 64)}`));
    }
    return data;
}

// const provider = new ethers.providers.Web3Provider(window.ethereum)
const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed1.binance.org/');

export const sources = id => [ "Mystery Box", "Airdrop" ][id] ?? id;
export const rarities = id => [ "Common", "Rare", "Epic", "Legendary", "Paw-some" ][id] ?? id;
export const catgirlDb = (season, source, rarity) => ({
    1: {
        0: {
            0: "Mae",
            1: "Kita",
            2: "Hana",
            3: "Celeste",
            4: "Mittsy"
        },
        1: {
            0: "Lisa",
            1: "Aoi",
            2: "Rin"
        }
    }
})[season]?.[source]?.[rarity] ?? "UNKNOWN";

export const parseCatgirlsFromTransaction = async (txHash) =>
{
    const tx = await provider.getTransactionReceipt(txHash);

    let catgirls = [];
    // get new catgirl info
    for(let newCatgirl of tx.logs.filter(t => t.topics.some(tn => tn == topics.topic1)))
    {
        const data = parseData(newCatgirl.data.substr(2));
        catgirls.push({ tokenId: data[0].toNumber(), nyaScore: data[1].toNumber(), someTimestamp: data[2].toNumber(), rarity: null, season: null, source: null })
    }

    // get catgirl meta data
    let t2Topics = tx.logs.filter(t => t.topics.some(tn => tn == topics.topic2));
    if(t2Topics.length == 0)
    {
        console.error("T2 topics missing");
    }
    else if(t2Topics.length > 1)
    {
        console.error("Unable to parse multiple t2 topics from transaction");
    }
    else
    {
        const t2data = parseData(t2Topics[0].data.substr(2));

        if(t2data < 3) 
        {
            console.error("Invalid log data");
            return catgirls;
        }

        // let receiverAddress = t2data[0];
        let typeValue = t2data[1];
        let count = t2data[2];

        if(typeValue != 64)
        {
            console.error(`Unexpected header, expected 64 but found ${typeValue}, continueing anyway`)
        }

        if(t2data.length != (3 + 4 * catgirls.length) || catgirls.length != count)
        {
            console.error(`Invalid length for t2 topics. `)
            return catgirls;
        }

        for(let i = 0; i < count; i++)
        {
            catgirls[i].source = t2data[3 + i * 4 + 0];
            catgirls[i].season = t2data[3 + i * 4 + 1];
            catgirls[i].rarity = t2data[3 + i * 4 + 2];
            if(catgirls[i].nyaScore != t2data[3 + i * 4 + 3])
                console.error(`the nya score of index ${i} does not match the expected value!`)
        }
    }

    return catgirls;
};