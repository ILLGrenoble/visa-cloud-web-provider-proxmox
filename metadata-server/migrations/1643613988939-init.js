const { Table } = require("typeorm");

module.exports = class init1643613988939 {

    async up(queryRunner){
        await queryRunner.createTable(new Table({
            name: "vm",
            columns: [
                {
                    name: "id",
                    type: "text",
                    isPrimary: true
                },
                {
                    name: "user_data",
                    type: "text"
                },
                {
                    name: "meta_data",
                    type: "text"
                },
            ]
        }));
    }

    async down(queryRunner) {
        await queryRunner.dropTable("vm");
    }

}
