const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EmployeeSchema = Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    corporate: {
        type: Schema.Types.ObjectId,
        ref: 'Corporates',
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
},
    {
        timestamps: true
    }
)

module.exports = mongoose.model('Employees', EmployeeSchema);
