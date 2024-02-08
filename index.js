const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();
const morgan = require('morgan');
app.use(express.json());

app.use(morgan('dev'))

const sequelize = new Sequelize('sql6682771', 'sql6682771', 'LP8CwbT749', {
    host: 'sql6.freesqldatabase.com',
    port: 3306,
    dialect: 'mysql',
})

const Contact = sequelize.define('Contact', {
    phoneNumber: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
    },
    linkedId: {
        type: DataTypes.INTEGER,
    },
    linkPrecedence: {
        type: DataTypes.ENUM('primary', 'secondary'),
    }
}, { createdAt: true, updatedAt: true, deletedAt: true });

const syncSequelizeModels = async () => {
    try {
        await sequelize.sync();
        console.log('Sequelize models synchronized successfully');
    } catch (error) {
        console.error('Error synchronizing Sequelize models:', error);
        throw error;
    }
};

syncSequelizeModels();

app.post('/identify', async (req, res) => {
    const { email, phoneNumber } = req.body;

    try {

        let existingPrimaryContacts = await Contact.findAll({
            where: {
                [Op.or]: [
                    { email },
                    { phoneNumber },
                ],
            },
        });

        if (!existingPrimaryContacts || existingPrimaryContacts.length === 0) {
            // If no existing primary contact, create a new one
            const newPrimaryContact = await Contact.create({
                phoneNumber,
                email,
                linkPrecedence: 'primary',
            });

            res.status(200).json({
                contact: {
                    primaryContactId: newPrimaryContact.id,
                    emails: [newPrimaryContact.email],
                    phoneNumbers: [newPrimaryContact.phoneNumber],
                    secondaryContactIds: [],
                },
            });
        } else {

            const isMatchingPrimary = existingPrimaryContacts.some(contact =>
                (phoneNumber && contact.phoneNumber === phoneNumber) || (email && contact.email === email)
            );

            if (isMatchingPrimary) {
                let id;
                let existingPrimaryContact = await Contact.findAll({
                    where: {
                        [Op.or]: [
                            { email },
                            { phoneNumber },
                        ],
                    },
                });
                if (existingPrimaryContact[0].linkPrecedence == 'primary') {
                    id = existingPrimaryContact[0].id
                }
                else {
                    id = existingPrimaryContact[0].linkedId
                }


                const newSecondaryContact = await Contact.create({
                    phoneNumber,
                    email,
                    linkedId: id,
                    linkPrecedence: 'secondary',
                });

                const allSecondaryContacts = await Contact.findAll({
                    where: {
                        linkedId: id,
                        linkPrecedence: 'secondary',
                    },
                });

                const uniqueSecondaryEmails = Array.from(new Set(allSecondaryContacts.map(contact => contact.email)));
                const uniqueSecondaryPhoneNumbers = Array.from(new Set(allSecondaryContacts.map(contact => contact.phoneNumber)));

                res.status(200).json({
                    contact: {
                        primaryContactId: existingPrimaryContacts[0].id,
                        emails: [...uniqueSecondaryEmails],
                        phoneNumbers: [...uniqueSecondaryPhoneNumbers],
                        secondaryContactIds: allSecondaryContacts.map(contact => contact.id),
                    },
                });
            } else {
                const primaryContact = existingPrimaryContacts[0];
                res.status(200).json({
                    contact: {
                        primaryContactId: primaryContact.id,
                        emails: [primaryContact.email],
                        phoneNumbers: [primaryContact.phoneNumber],
                        secondaryContactIds: [],
                    },
                });
            }
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});



const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

