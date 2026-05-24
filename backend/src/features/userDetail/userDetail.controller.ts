import AppDataSource from '@/config/database';
import { UserDetail } from '@/models/UserDetail.entity';
import { User } from '@/models/User.entity';
import { successResponse, errorResponse } from '@/utils/response';
import { CustomContext, UserDetailStatus, UserRole } from '@/types';

export async function createUserDetail(ctx: CustomContext): Promise<void> {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const userDetailRepository = AppDataSource.getRepository(UserDetail);
    const userRepository = AppDataSource.getRepository(User);

    // Check if user exists
    const user = await userRepository.findOne({ where: { id: ctx.user.id } });
    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    // Check if UserDetail already exists
    const existingDetail = await userDetailRepository.findOne({ 
      where: { userId: ctx.user.id } 
    });
    
    if (existingDetail) {
      errorResponse(ctx, 'User detail already exists', 400);
      return;
    }

    // koa-body stores files in ctx.request.files with field names as keys
    // Handle different possible file structures from koa-body/formidable
    const files = ctx.request.files || {};
    const body = ctx.request.body || {};
    
    // Handle both nested and flat form field structures from multipart/form-data
    // koa-body may parse idDocument[number] as a flat key or nested object
    const idDocumentNumber = body['idDocument[number]'] || body.idDocument?.number || '';
    const panNumber = body['pan[number]'] || body.pan?.number || '';

    // Process file uploads - koa-body stores files with their field names
    // Handle both correct and typo field names, and different array/single file formats
    const getFile = (key: string, altKey?: string) => {
      const file = files[key] || (altKey ? files[altKey] : undefined);
      if (!file) return undefined;
      // Handle both array and single file formats
      if (Array.isArray(file)) {
        return file[0];
      }
      return file;
    };
    
    const idDocumentFront = getFile('idDocument[front]', 'idDocumen[front]'); // Handle typo
    const idDocumentBack = getFile('idDocument[back]');
    const panImage = getFile('pan[image]');
    const selfieFile = getFile('selfie');
    
    const processedDocuments: {
      idDocument: {
        front: string;
        back: string;
        number: string;
      };
      pan?: {
        image: string;
        number: string;
      };
      selfie?: string;
    } = {
      idDocument: {
        front: (idDocumentFront && ((idDocumentFront as any).newFilename || idDocumentFront.filename || idDocumentFront.path)) || '',
        back: (idDocumentBack && ((idDocumentBack as any).newFilename || idDocumentBack.filename || idDocumentBack.path)) || '',
        number: idDocumentNumber
      }
    };

    // Add PAN and selfie only if provided
    if (panImage || panNumber) {
      processedDocuments.pan = {
        image: (panImage && ((panImage as any).newFilename || panImage.filename || panImage.path)) || '',
        number: panNumber || ''
      };
    }
    
    if (selfieFile) {
      processedDocuments.selfie = (selfieFile && ((selfieFile as any).newFilename || selfieFile.filename || selfieFile.path)) || '';
    }

    // Validate required fields - only ID document is required
    if (!processedDocuments.idDocument.front || !processedDocuments.idDocument.back) {
      errorResponse(ctx, 'Both front and back of ID document are required', 400);
      return;
    }
    
    if (!processedDocuments.idDocument.number) {
      errorResponse(ctx, 'ID document number is required', 400);
      return;
    }
    
    // Create and save the user detail
    const newUserDetail = userDetailRepository.create({
      userId: ctx.user.id,
      documents: processedDocuments,
      status: UserDetailStatus.PENDING,
      submittedAt: new Date(),
    });
    
    const savedUserDetail = await userDetailRepository.save(newUserDetail);
    
    // Update user's verification status
    await userRepository.update(ctx.user.id, { isUserDetailVerified: false });

    successResponse(ctx, {
      id: savedUserDetail.id,
      userId: savedUserDetail.userId,
      documents: savedUserDetail.documents,
      status: savedUserDetail.status,
      submittedAt: savedUserDetail.submittedAt,
      createdAt: savedUserDetail.createdAt,
      updatedAt: savedUserDetail.updatedAt,
    }, 'User detail created successfully', 201);
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to create user detail', 500);
  }
};

export async function getUserDetail(ctx: CustomContext): Promise<void> {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const userDetailRepository = AppDataSource.getRepository(UserDetail);

    const userDetail = await userDetailRepository.findOne({ 
      where: { userId: ctx.user.id },
      relations: ['user']
    });

    if (!userDetail) {
      errorResponse(ctx, 'User detail not found', 404);
      return;
    }

    successResponse(ctx, {
      id: userDetail.id,
      userId: userDetail.userId,
      documents: userDetail.documents,
      status: userDetail.status,
      rejectionReason: userDetail.rejectionReason,
      verifiedBy: userDetail.verifiedBy,
      verifiedAt: userDetail.verifiedAt,
      submittedAt: userDetail.submittedAt,
      createdAt: userDetail.createdAt,
      updatedAt: userDetail.updatedAt,
    }, 'User detail retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to retrieve user detail', 500);
  }
};

export async function getAllUserDetails(ctx: CustomContext): Promise<void> {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    // Check if user has admin privileges
    if (ctx.user.role !== UserRole.ADMIN) {
      errorResponse(ctx, 'Unauthorized access', 403);
      return;
    }

    const userDetailRepository = AppDataSource.getRepository(UserDetail);

    const { page = 1, limit = 10, status } = ctx.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [userDetails, total] = await userDetailRepository.findAndCount({
      where,
      relations: ['user'],
      skip,
      take: Number(limit),
      order: { createdAt: 'DESC' }
    });

    successResponse(ctx, {
      data: userDetails.map(detail => ({
        id: detail.id,
        userId: detail.userId,
        documents: detail.documents,
        status: detail.status,
        rejectionReason: detail.rejectionReason,
        verifiedBy: detail.verifiedBy,
        verifiedAt: detail.verifiedAt,
        submittedAt: detail.submittedAt,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'User details retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to retrieve user details', 500);
  }
};

export async function updateUserDetail(ctx: CustomContext): Promise<void> {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const userDetailRepository = AppDataSource.getRepository(UserDetail);
    const userRepository = AppDataSource.getRepository(User);

    const userDetail = await userDetailRepository.findOne({ 
      where: { userId: ctx.user.id } 
    });

    if (!userDetail) {
      errorResponse(ctx, 'User detail not found', 404);
      return;
    }

    // Prevent updates if already verified
    if (userDetail.status === UserDetailStatus.VERIFIED) {
      errorResponse(ctx, 'Cannot update verified user details', 400);
      return;
    }

    const { documents, status } = ctx.state.validated || {};
    
    // Handle file uploads if provided
    const { documents: uploadedFiles } = ctx.request.files || {};
    const { idDocument, pan, selfie } = ctx.request.body || {};
    
    // If documents are provided in validated state, use them
    // Otherwise, merge with existing documents
    if (documents) {
      userDetail.documents = documents;
    } else if (uploadedFiles || idDocument || pan || selfie) {
      // Process file uploads similar to create
      const idDocumentFront = uploadedFiles && 'idDocument[front]' in uploadedFiles ? uploadedFiles['idDocument[front]'] : undefined;
      const idDocumentBack = uploadedFiles && 'idDocument[back]' in uploadedFiles ? uploadedFiles['idDocument[back]'] : undefined;
      const panImage = uploadedFiles && 'pan[image]' in uploadedFiles ? uploadedFiles['pan[image]'] : undefined;
      const selfieFile = uploadedFiles && 'selfie' in uploadedFiles ? uploadedFiles['selfie'] : undefined;
      
      // Merge with existing documents
      const existingDocs = userDetail.documents || {
        idDocument: { front: '', back: '', number: '' },
        pan: { image: '', number: '' },
        selfie: ''
      };
      
      userDetail.documents = {
        idDocument: {
          front: Array.isArray(idDocumentFront) && idDocumentFront[0] ? idDocumentFront[0].newFilename : (existingDocs.idDocument?.front || ''),
          back: Array.isArray(idDocumentBack) && idDocumentBack[0] ? idDocumentBack[0].newFilename : (existingDocs.idDocument?.back || ''),
          number: idDocument?.number || existingDocs.idDocument?.number || ''
        },
        pan: {
          image: Array.isArray(panImage) && panImage[0] ? panImage[0].newFilename : (existingDocs.pan?.image || ''),
          number: pan?.number || existingDocs.pan?.number || ''
        },
        selfie: Array.isArray(selfieFile) && selfieFile[0] ? selfieFile[0].newFilename : (existingDocs.selfie || '')
      };
    }
    
    if (status) {
      if (status === UserDetailStatus.DRAFT) {
        userDetail.status = UserDetailStatus.DRAFT;
      } else if (status === UserDetailStatus.PENDING) {
        userDetail.status = UserDetailStatus.PENDING;
        userDetail.submittedAt = new Date();
      }
    } else {
      // Default behavior if status not provided: set to PENDING if it was REJECTED or CHANGES_REQUESTED
      if (userDetail.status === UserDetailStatus.REJECTED || userDetail.status === UserDetailStatus.CHANGES_REQUESTED || userDetail.status === UserDetailStatus.DRAFT) {
        userDetail.status = UserDetailStatus.PENDING;
        userDetail.submittedAt = new Date();
      }
    }
    
    userDetail.rejectionReason = undefined; // Clear rejection reason on resubmission

    await userDetailRepository.save(userDetail);
    
    // Reset user verification status
    await userRepository.update(ctx.user.id, { isUserDetailVerified: false });

    successResponse(ctx, {
      id: userDetail.id,
      userId: userDetail.userId,
      documents: userDetail.documents,
      status: userDetail.status,
      submittedAt: userDetail.submittedAt,
      updatedAt: userDetail.updatedAt,
    }, 'User detail updated successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to update user detail', 500);
  }
};

export async function verifyUserDetail(ctx: CustomContext): Promise<void> {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    // Check if user has admin privileges
    if (ctx.user.role !== UserRole.ADMIN && ctx.user.role !== UserRole.SUPER_ADMIN) {
      errorResponse(ctx, 'Unauthorized access. Admin privileges required', 403);
      return;
    }

    const { userId } = ctx.params;
    const { status, rejectionReason } = ctx.state.validated;

    const userDetailRepository = AppDataSource.getRepository(UserDetail);
    const userRepository = AppDataSource.getRepository(User);

    // Validate userId format (should be UUID)
    if (!userId || typeof userId !== 'string') {
      errorResponse(ctx, 'Invalid user ID', 400);
      return;
    }

    const userDetail = await userDetailRepository.findOne({ 
      where: { userId },
      relations: ['user']
    });

    if (!userDetail) {
      errorResponse(ctx, 'User detail not found', 404);
      return;
    }

    // Validate status transition
    const validStatuses = [
      UserDetailStatus.VERIFIED,
      UserDetailStatus.REJECTED,
      UserDetailStatus.CHANGES_REQUESTED,
      UserDetailStatus.PENDING
    ];
    
    if (!validStatuses.includes(status)) {
      errorResponse(ctx, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      return;
    }

    // Prevent changing status if already verified (unless changing to rejected or changes_requested)
    if (userDetail.status === UserDetailStatus.VERIFIED && 
        status !== UserDetailStatus.REJECTED && 
        status !== UserDetailStatus.CHANGES_REQUESTED) {
      errorResponse(ctx, 'Cannot modify verified user details. Use reject or request changes instead.', 400);
      return;
    }

    // Require rejection reason for rejection or changes requested
    if ((status === UserDetailStatus.REJECTED || status === UserDetailStatus.CHANGES_REQUESTED)) {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        errorResponse(ctx, 'Rejection reason is required when rejecting or requesting changes', 400);
        return;
      }
      if (rejectionReason.trim().length < 10) {
        errorResponse(ctx, 'Rejection reason must be at least 10 characters long', 400);
        return;
      }
    }

    // Update status
    const previousStatus = userDetail.status;
    userDetail.status = status;

    // Set verification metadata only for admin actions (verified, rejected, changes_requested)
    if (status === UserDetailStatus.VERIFIED || 
        status === UserDetailStatus.REJECTED || 
        status === UserDetailStatus.CHANGES_REQUESTED) {
      userDetail.verifiedBy = ctx.user.id;
      userDetail.verifiedAt = new Date();
    }

    // Handle rejection reason
    if (status === UserDetailStatus.REJECTED || status === UserDetailStatus.CHANGES_REQUESTED) {
      userDetail.rejectionReason = rejectionReason.trim();
    } else {
      // Clear rejection reason for other statuses
      userDetail.rejectionReason = undefined;
    }

    // Save user detail
    await userDetailRepository.save(userDetail);

    // Update user verification status
    if (status === UserDetailStatus.VERIFIED) {
      await userRepository.update(userId, { isUserDetailVerified: true });
    } else if (previousStatus === UserDetailStatus.VERIFIED) {
      // If previously verified but now rejected/changes requested, set to false
      await userRepository.update(userId, { isUserDetailVerified: false });
    }

    // Prepare response message
    let message = '';
    switch (status) {
      case UserDetailStatus.VERIFIED:
        message = 'User detail verified successfully';
        break;
      case UserDetailStatus.REJECTED:
        message = 'User detail rejected successfully';
        break;
      case UserDetailStatus.CHANGES_REQUESTED:
        message = 'Changes requested successfully';
        break;
      case UserDetailStatus.PENDING:
        message = 'User detail status reset to pending';
        break;
      default:
        message = 'User detail updated successfully';
    }

    successResponse(ctx, {
      id: userDetail.id,
      userId: userDetail.userId,
      status: userDetail.status,
      rejectionReason: userDetail.rejectionReason,
      verifiedBy: userDetail.verifiedBy,
      verifiedAt: userDetail.verifiedAt,
      submittedAt: userDetail.submittedAt,
      updatedAt: userDetail.updatedAt,
    }, message);
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to verify user detail', 500);
  }
};

export async function deleteUserDetail(ctx: CustomContext): Promise<void> {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const userDetailRepository = AppDataSource.getRepository(UserDetail);
    const userRepository = AppDataSource.getRepository(User);

    const userDetail = await userDetailRepository.findOne({ 
      where: { userId: ctx.user.id } 
    });

    if (!userDetail) {
      errorResponse(ctx, 'User detail not found', 404);
      return;
    }

    await userDetailRepository.remove(userDetail);
    
    successResponse(ctx, null, 'User detail deleted successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to delete user detail', 500);
  }
};

// All functions are now directly exported above