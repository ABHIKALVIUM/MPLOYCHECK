import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Simple Pipe to capitalize words
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'cap' })
export class CapitalizePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

@Pipe({ name: 'fmtMonthYear' })
export class FmtMonthYearPipe implements PipeTransform {
  transform(value: string | null): string {
    if (!value) return 'Present';
    const date = new Date(value);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
  }
}

@Pipe({ name: 'fmtDate' })
export class FmtDatePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

@NgModule({
  declarations: [
    CapitalizePipe,
    FmtMonthYearPipe,
    FmtDatePipe
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CapitalizePipe,
    FmtMonthYearPipe,
    FmtDatePipe
  ]
})
export class SharedModule { }
