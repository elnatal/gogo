const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EmployeeSchema = Schema({
    name: {
        type: String,
        required: true
    },
    corporate: {
        type: Schema.Types.ObjectId,
        ref: 'Corporates'
    }
},
    {
        timestamps: true
    }
)

module.exports = mongoose.model('Employees', EmployeeSchema);