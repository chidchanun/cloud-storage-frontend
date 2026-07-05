import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { FileService } from '../../core/services/file.service';
import { Trash } from './trash';

describe('Trash', () => {
  let component: Trash;
  let fixture: ComponentFixture<Trash>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trash],
      providers: [
        provideRouter([]),
        {
          provide: FileService,
          useValue: {
            trashList: () => of([]),
            restore: () => of({ message: 'restored', fileId: 1 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Trash);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
