const mongoose = require("mongoose")

const AssignmentSchema = new mongoose.Schema({
    assignmentName:{type:String,required:true},
    dueDate:{type:Date,required:true},
    noOfQuestions:{type:String,required:true},
    technology:{type:String,required:true},
})

module.exports = mongoose.model("Assignments",AssignmentSchema)