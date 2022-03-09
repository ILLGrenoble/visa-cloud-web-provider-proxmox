import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Flavour } from "./flavour.model";

@Entity()
export class Vm {
    @PrimaryColumn()
    id: string;

    @Column({nullable: false})
    name: string;

    @ManyToOne(type => Flavour)
    @JoinColumn({name: 'flavour_id'})
    flavour: Flavour;

    @Column({name: 'flavour_id'})
    flavourId: string;

    @Column({name: 'created_at', type: 'date', nullable: false, default: () => "CURRENT_TIMESTAMP"})
    createdAt: string;

    @Column({name: 'image_id', nullable: false})
    imageId: string;

    @Column()
    metadata: string;

    @Column({name: 'boot_command'})
    bootCommand: string;

    @Column({nullable: false, default: 'BUILDING'})
    status: string;

    @Column({nullable: false, default: 0})
    startCount: number;
}